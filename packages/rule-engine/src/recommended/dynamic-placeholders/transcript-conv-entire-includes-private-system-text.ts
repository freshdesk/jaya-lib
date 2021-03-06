import { ProductEventPayload } from '@freshworks-jaya/marketplace-models';
import Freshchat from '@freshworks-jaya/freshchat-api';
import { Integrations } from '../../models/rule-engine';
import { ErrorCodes, ErrorTypes } from '../../models/error-codes';
import { LogSeverity } from '../../services/GoogleCloudLogging';
import { Utils } from '../../Utils';

export default (productEventPayload: ProductEventPayload, integrations: Integrations): Promise<string> => {
  const freshchatApiUrl = integrations.freshchatv2.url;
  const freshchatApiToken = integrations.freshchatv2.token;
  const freshchat = new Freshchat(freshchatApiUrl, freshchatApiToken);
  const modelProperties = productEventPayload.data.conversation || productEventPayload.data.message;

  return freshchat
    .getConversationTranscript(
      `https://${productEventPayload.domain}`,
      modelProperties.app_id,
      modelProperties.conversation_id,
      {
        isIncludeFreshchatLink: true,
        output: 'text',
        timezoneOffset: integrations.timezoneOffset,
      },
    )
    .then((transcript) => Promise.resolve(transcript))
    .catch((err) => {
      Utils.log(
        productEventPayload,
        integrations,
        ErrorCodes.FreshchatPlaceholder,
        {
          error: {
            data: err?.response?.data,
            headers: err?.response?.headers,
          },
          errorType: ErrorTypes.TranscriptEntirePrivateSystemText,
        },
        LogSeverity.ERROR,
      );
      return Promise.reject();
    });
};
