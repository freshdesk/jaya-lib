import { ProductEventData } from '@freshworks-jaya/marketplace-models';
import { Condition } from '../../models/rule';
import { Utils } from '../../Utils';
import { Integrations } from '../../models/rule-engine';

export default (
  condition: Condition,
  productEventData: ProductEventData,
  integrations: Integrations,
): Promise<void> => {
  const modelProperties = productEventData.conversation || productEventData.message;

  return Utils.evaluateCondition(condition.operator, modelProperties.status, condition.value as string, integrations);
};
