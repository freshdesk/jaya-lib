import { ProductEventPayload } from '@freshworks-jaya/marketplace-models';
import { Integrations } from '../../models/rule-engine';
import axios from 'axios';
import { Api, SendEmailAnyoneValue } from '../../models/rule';
import { Utils } from '../../Utils';
import { PlaceholdersMap } from '@freshworks-jaya/utilities';
import { ErrorCodes } from '../../models/error-codes';

export default async (
  integrations: Integrations,
  productEventPayload: ProductEventPayload,
  actionValue: unknown,
  domain: string,
  placeholders: PlaceholdersMap,
  apis: Api[],
): Promise<PlaceholdersMap> => {
  const modelProperties = productEventPayload.data.conversation || productEventPayload.data.message;
  const appId = modelProperties.app_id;

  if (!integrations.emailService) {
    return Promise.reject('No email service integration');
  }

  const sendEmailAnyoneValue = actionValue as SendEmailAnyoneValue;
  let generatedPlaceholders: PlaceholdersMap = {};

  try {
    // Step 1: Setup dynamic placeholders using values from subject and body
    generatedPlaceholders = await Utils.getDynamicPlaceholders(
      `${sendEmailAnyoneValue.subject} ${sendEmailAnyoneValue.body}`,
      productEventPayload,
      integrations,
      domain,
      placeholders,
    );

    const combinedPlaceholders = { ...placeholders, ...generatedPlaceholders };

    // Step 2: Replace placeholders in subject and body
    const emailTo = sendEmailAnyoneValue.to.map((email) => {
      return {
        email: Utils.processHandlebarsAndReplacePlaceholders(email, combinedPlaceholders),
      };
    });

    // Replace end-of-line characters with <br>
    sendEmailAnyoneValue.body = sendEmailAnyoneValue.body.replace(/(?:\r\n|\r|\n)/g, '<br>');

    const emailParams = {
      body: Utils.processHandlebarsAndReplacePlaceholders(sendEmailAnyoneValue.body, combinedPlaceholders),
      subject: Utils.processHandlebarsAndReplacePlaceholders(sendEmailAnyoneValue.subject, combinedPlaceholders),
      to: emailTo,
    };

    // Step 3: Make send email API call
    await axios.post(
      `${integrations.emailService.url}/api/v1/email/send`,
      JSON.stringify({
        accountId: appId,
        from: {
          email: 'no-reply@freshchat.com',
          name: 'Freshchat Automations',
        },
        html: emailParams.body,
        subject: emailParams.subject,
        to: emailParams.to,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          authorization: integrations.emailService.apiKey,
        },
      },
    );
  } catch (err) {
    Utils.log(productEventPayload, integrations, ErrorCodes.SendEmail, {
      error: err,
    });
    return Promise.reject('Failed to setup dynamic placeholders');
  }

  return Promise.resolve(generatedPlaceholders);
};
