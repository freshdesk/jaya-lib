import {
  RulePlugin,
  PluginActions,
  PluginOperators,
  PluginTriggerActions,
  PluginConditions,
  PluginTriggerActors,
  PluginDynamicPlaceholders,
} from './models/plugin';
import { PlaceholdersMap } from '@freshworks-jaya/utilities';

class RuleConfig {
  actions?: PluginActions = {};

  operators?: PluginOperators = {};

  triggerActions?: PluginTriggerActions = {};

  triggerActors?: PluginTriggerActors = {};

  conditions?: PluginConditions = {};

  placeholders?: PlaceholdersMap = {};

  dynamicPlaceholders?: PluginDynamicPlaceholders = {};

  reset = (): void => {
    this.actions = {};
    this.operators = {};
    this.triggerActions = {};
    this.triggerActors = {};
    this.conditions = {};
    this.placeholders = {};
    this.dynamicPlaceholders = {};
  };

  registerPlugins = (plugins: RulePlugin[]): void => {
    for (let i = 0; i < plugins.length; i++) {
      const rulePlugin = plugins[i];

      if (rulePlugin.actions) {
        this.actions = { ...this.actions, ...rulePlugin.actions };
      }

      if (rulePlugin.operators) {
        this.operators = { ...this.operators, ...rulePlugin.operators };
      }

      if (rulePlugin.triggerActions) {
        this.triggerActions = { ...this.triggerActions, ...rulePlugin.triggerActions };
      }

      if (rulePlugin.triggerActors) {
        this.triggerActors = { ...this.triggerActors, ...rulePlugin.triggerActors };
      }

      if (rulePlugin.conditions) {
        this.conditions = { ...this.conditions, ...rulePlugin.conditions };
      }

      if (rulePlugin.placeholders) {
        this.placeholders = { ...this.placeholders, ...rulePlugin.placeholders };
      }

      if (rulePlugin.dynamicPlaceholders) {
        this.dynamicPlaceholders = { ...this.dynamicPlaceholders, ...rulePlugin.dynamicPlaceholders };
      }
    }
  };
}

const ruleConfig = new RuleConfig();
export default ruleConfig;
