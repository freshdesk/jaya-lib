import Kairos, { KairosSchedule, KairosScheduleOptions } from '@freshworks-jaya/kairos-api';
import { Event, ProductEventPayload, ProductEventData, ModelProperties } from '@freshworks-jaya/marketplace-models';
import { ActionExecutor } from './ActionExecutor';
import { Rule } from './models/rule';
import { RuleProcessor } from './RuleProcessor';
import { KairosCredentials, RuleEngineExternalEventPayload, Integrations } from './models/rule-engine';

export class TimerRuleEngine {
  /**
   * Add minutes to date object.
   */
  public static addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
  }

  /**
   * Checks if the rule is a timer rule and is enabled.
   */
  public static isMatchingTimerRule(
    event: Event,
    productEventData: ProductEventData,
    rule: Rule,
    integrations: Integrations,
  ): Promise<void> {
    if (rule.isTimer && rule.isEnabled) {
      return RuleProcessor.isRuleMatching(event, productEventData, rule, integrations);
    } else {
      return Promise.reject();
    }
  }

  /**
   * Gets the model for either conversation or message.
   */
  public static getModelProperties(productEventData: ProductEventData): ModelProperties {
    return productEventData.conversation || productEventData.message;
  }

  /**
   * Trigger creation of timers for incoming event.
   */
  public static async triggerTimers(
    payload: ProductEventPayload,
    rules: Rule[],
    externalEventUrl: string,
    kairosCredentials: KairosCredentials,
    integrations: Integrations,
  ): Promise<void> {
    console.log('triggerTimers enter');
    let schedulesToCreate: KairosScheduleOptions[] = [];
    const scheduler = new Kairos(kairosCredentials);

    // Iterate through each rule
    for (let ruleIndex = 0, len = rules.length; ruleIndex < len; ruleIndex += 1) {
      const rule = rules[ruleIndex];

      const modelProperties = this.getModelProperties(payload.data);
      let isMatchingTimerRule = false;
      // Check for timer rules that are enabled and are matching the trigger conditions.
      try {
        await this.isMatchingTimerRule(payload.event, payload.data, rule, integrations);
        isMatchingTimerRule = true;
      } catch (err) {}
      console.log('isMatchingTimerRule', isMatchingTimerRule);
      if (isMatchingTimerRule) {
        const jobId = `${modelProperties.app_id}_${modelProperties.conversation_id}_${ruleIndex}`;

        // Fetch an existing schedule for the same current rule,
        let existingSchedule;
        try {
          existingSchedule = (await scheduler.fetchSchedule(jobId)) as KairosSchedule;
        } catch (err) {}
        console.log('existingSchedule', JSON.stringify(existingSchedule));
        // If there are no existing schedules, create schedule object
        // and push it into the schedules array for bulk scheduling later.
        if (!existingSchedule) {
          schedulesToCreate = [
            ...schedulesToCreate,
            {
              jobId,
              payload: {
                jobId,
                originalPayload: payload,
                ruleIndex,
              },
              scheduledTime: this.addSeconds(new Date(), rule.timerValue).toISOString(),
              webhookUrl: externalEventUrl,
            },
          ];
        }
      }
    }
    console.log('schedulesToCreate', JSON.stringify(schedulesToCreate));
    if (schedulesToCreate.length) {
      try {
        await scheduler.bulkCreateSchedules(schedulesToCreate);
        console.log('bulkCreateSchedules success');
      } catch (err) {
        console.log('bulkCreateSchedules err', JSON.stringify(err));
        return Promise.reject('Error creating bulk schedules');
      }
    }

    return Promise.resolve();
  }

  /**
   * Execute actions on completion of timer.
   */
  public static async executeTimerActions(
    externalEventPayload: RuleEngineExternalEventPayload,
    rules: Rule[],
    kairosCredentials: KairosCredentials,
    integrations: Integrations,
  ): Promise<void> {
    const scheduler = new Kairos(kairosCredentials);

    // Delete schedule for given jobId
    try {
      await scheduler.deleteSchedule(externalEventPayload.data.jobId);
    } catch (err) {
      throw new Error('Error deleting kairos schedule before execution');
    }

    // Get actions from rules
    const timerRule = rules[externalEventPayload.data.ruleIndex];

    // Execute actions
    if (timerRule && Array.isArray(timerRule.actions)) {
      ActionExecutor.handleActions(integrations, timerRule.actions, externalEventPayload.data.originalPayload.data);
    }
  }

  /**
   * Invalidate rules with timers that match the trigger conditions.
   */
  public static async invalidateTimers(
    payload: ProductEventPayload,
    rules: Rule[],
    kairosCredentials: KairosCredentials,
  ): Promise<void> {
    console.log('invalidateTimers enter', JSON.stringify(rules));
    const modelProperties = payload.data.conversation || payload.data.message;

    const jobsToDelete = rules.reduce((jobIds: string[], rule, ruleIndex) => {
      let isMatch = false;

      if (rule.isEnabled && rule.isTimer && rule.invalidators) {
        isMatch = RuleProcessor.isTriggerConditionMatching(payload.event, payload.data, rule.invalidators);
      }

      if (isMatch) {
        jobIds.push(`${modelProperties.app_id}_${modelProperties.conversation_id}_${ruleIndex}`);
      }
      return jobIds;
    }, []);

    console.log('jobsToDelete', JSON.stringify(jobsToDelete));
    if (jobsToDelete && jobsToDelete.length) {
      const scheduler = new Kairos(kairosCredentials);
      return scheduler.bulkDeleteSchedules(jobsToDelete).then(
        () => Promise.resolve(),
        () => Promise.reject('Error during bulkDeleteSchedules'),
      );
    }
    console.log('invalidateTimers end');
    return Promise.resolve();
  }
}
