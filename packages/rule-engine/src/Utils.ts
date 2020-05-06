import { ConditionOperator } from './index';
import ruleConfig from './RuleConfig';
import usernameVerbs from './constants/username-verbs';
import usernameNouns from './constants/username-nouns';
import { Integrations } from './models/rule-engine';
import axios from 'axios';
import { BusinessHour, findMatchingKeys, PlaceholdersMap } from '@freshworks-jaya/utilities';
import { ProductEventData } from '@freshworks-jaya/marketplace-models';

export class Utils {
  public static async setupDynamicPlaceholders(
    text: string,
    productEventData: ProductEventData,
    integrations: Integrations,
  ): Promise<void> {
    // Step 1: Extract dynamic placeholder keys from text
    // Step 2: Fetch data required by all matching keys
    // Step 3: Setup key-value pairs in placeholders object using ruleConfig

    if (ruleConfig.dynamicPlaceholders) {
      // Step 1
      // ------
      // Will receive an array like ['metrics.average_wait_time']
      const matchingDynamicPlaceholderKeys = findMatchingKeys(text, ruleConfig.dynamicPlaceholders);

      // Step 2
      // ------
      if (matchingDynamicPlaceholderKeys) {
        for (let i = 0, len = matchingDynamicPlaceholderKeys.length; i < len; i++) {
          const dynamicPlaceholderKey = matchingDynamicPlaceholderKeys[i];
          const placeholders: PlaceholdersMap = {};

          if (ruleConfig.placeholders && ruleConfig.placeholders[dynamicPlaceholderKey]) {
            continue;
          }

          try {
            const value = await ruleConfig.dynamicPlaceholders[dynamicPlaceholderKey](productEventData, integrations);
            placeholders[dynamicPlaceholderKey] = value;

            // Step 3
            // ------
            ruleConfig.registerPlugins([
              {
                placeholders,
              },
            ]);
          } catch (err) {}
        }
      }
    }

    return Promise.resolve();
  }

  /**
   * Returns true if username is generated
   */
  public static isUsernameGenerated(username: string): boolean {
    const split = username.split(/\s+/);

    if (split.length !== 2) {
      return false;
    }

    const [verb, noun] = split;
    return !!(usernameVerbs[verb] && usernameNouns[noun]);
  }

  /**
   * Converts operand to string.
   */
  public static convertOperand(operand: string): string {
    let retVal: string = operand && operand.toString().trim().toLowerCase();

    retVal = typeof retVal === 'string' ? retVal : '';
    return retVal;
  }

  /**
   * Performs operation defined by 'operator' on operands operand1 and operand2.
   */
  public static evaluateCondition(
    operator: ConditionOperator,
    operand1: string,
    operand2: string,
    integrations: Integrations,
  ): Promise<void> {
    const sanitizedOperand1 = this.convertOperand(operand1);
    const sanitizedOperand2 = this.convertOperand(operand2);

    const operatorFunc = ruleConfig.operators && ruleConfig.operators[operator];

    if (operatorFunc) {
      return operatorFunc(sanitizedOperand1, sanitizedOperand2, integrations);
    }

    throw new Error('no matching condition');
  }

  /**
   * Either resolve or reject based on boolean param.
   */
  public static promisify = (response: boolean): Promise<void> => {
    return response ? Promise.resolve() : Promise.reject();
  };

  /**
   * Gets business hour for an account based on businessHourId provided.
   */
  public static getBusinessHour = (businessHourId: string, integrations: Integrations): Promise<BusinessHour> => {
    const freshchatApiUrl = integrations.freshchatv1.url;
    const freshchatApiToken = integrations.freshchatv1.token;
    return new Promise((resolve, reject) => {
      axios
        .get(`${freshchatApiUrl}/operating_hours_v2`, {
          headers: {
            Authorization: freshchatApiToken,
            'Content-Type': 'application/json',
          },
        })
        .then((response: { data: { operatingHours: BusinessHour[] } }) => {
          const matchingBusinessHour = response.data.operatingHours.find((businessHour) => {
            return businessHour.operatingHoursId === parseInt(businessHourId, 10);
          });
          if (matchingBusinessHour) {
            resolve(matchingBusinessHour);
          } else {
            reject();
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}
