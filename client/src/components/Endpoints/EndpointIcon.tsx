import { getEndpointField, isAssistantsEndpoint, isAgentsEndpoint } from 'librechat-data-provider';
import type {
  TPreset,
  TConversation,
  TAgentsMap,
  TAssistantsMap,
  TEndpointsConfig,
} from 'librechat-data-provider';
import ConvoIconURL from '~/components/Endpoints/ConvoIconURL';
import { getAgentAvatarUrl, getIconEndpoint } from '~/utils';
import MinimalIcon from '~/components/Endpoints/MinimalIcon';
import { resolveProviderIcon } from '~/hooks/Endpoint';
import { useLocalize } from '~/hooks';
import { isImageURL } from '~/utils/icons';

const emptyEndpointsConfig = {} as TEndpointsConfig;

function QuinnDot({ className }: { className?: string }) {
  return (
    <span className={`inline-block size-2 rounded-full ${className ?? ''}`} aria-hidden="true" />
  );
}

export default function EndpointIcon({
  conversation,
  endpointsConfig = emptyEndpointsConfig,
  className = 'me-0',
  assistantMap,
  agentsMap,
  context,
  size = 20,
}: {
  conversation: TConversation | TPreset | null;
  endpointsConfig: TEndpointsConfig;
  containerClassName?: string;
  context?: 'message' | 'nav' | 'landing' | 'menu-item';
  assistantMap?: TAssistantsMap;
  agentsMap?: TAgentsMap;
  className?: string;
  size?: number;
}) {
  const localize = useLocalize();
  const convoIconURL = conversation?.iconURL ?? '';
  const originalEndpoint = conversation?.endpoint;
  let endpoint = originalEndpoint;
  endpoint = getIconEndpoint({ endpointsConfig, iconURL: convoIconURL, endpoint });

  const endpointIconURL = getEndpointField(endpointsConfig, endpoint, 'iconURL');
  const { provider } = resolveProviderIcon({ endpoint, endpointsConfig });

  const agent = isAgentsEndpoint(endpoint) ? agentsMap?.[conversation?.agent_id ?? ''] : null;
  const assistant = isAssistantsEndpoint(endpoint)
    ? assistantMap?.[endpoint]?.[conversation?.assistant_id ?? '']
    : null;
  const agentAvatar = getAgentAvatarUrl(agent) ?? '';
  const agentName = agent?.name ?? '';
  const assistantAvatar = (assistant && (assistant.metadata?.avatar as string)) || '';
  const assistantName = assistant && (assistant.name ?? '');
  const entityAvatar = agentAvatar || assistantAvatar;
  const entityName = agentName || assistantName || '';
  const isQuinnChat =
    context === 'menu-item' &&
    !isAgentsEndpoint(endpoint) &&
    (endpointsConfig?.[endpoint]?.modelDisplayLabel === 'Quinn' ||
      conversation?.modelLabel === 'Quinn');
  const hasCustomIcon =
    isImageURL(convoIconURL) || (convoIconURL !== '' && convoIconURL !== originalEndpoint);

  const iconURL = hasCustomIcon ? convoIconURL : entityAvatar || convoIconURL;

  if (isQuinnChat && !isImageURL(convoIconURL)) {
    return (
      <div
        data-testid="convo-icon"
        title="Quinn"
        aria-hidden="true"
        className={`text-text-secondary relative flex items-center justify-center rounded-sm ${className ?? ''}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <QuinnDot className="bg-accent-primary" />
      </div>
    );
  }

  if (
    context === 'menu-item' &&
    isAgentsEndpoint(endpoint) &&
    !isImageURL(entityAvatar) &&
    !isImageURL(convoIconURL)
  ) {
    return (
      <div
        data-testid="convo-icon"
        title={entityName || localize('com_ui_agent')}
        aria-hidden="true"
        className={`text-text-secondary relative flex items-center justify-center rounded-sm ${className ?? ''}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <QuinnDot className="bg-status-info" />
      </div>
    );
  }

  if (isImageURL(iconURL)) {
    return (
      <ConvoIconURL
        iconURL={iconURL}
        modelLabel={entityName || conversation?.chatGptLabel || conversation?.modelLabel || ''}
        provider={provider}
        context={context}
        assistantAvatar={assistantAvatar}
        assistantName={assistantName ?? ''}
        agentAvatar={agentAvatar}
        agentName={agentName}
      />
    );
  }

  return (
    <MinimalIcon
      iconURL={endpointIconURL}
      endpoint={endpoint}
      endpointsConfig={endpointsConfig}
      model={conversation?.model}
      error={false}
      className={className}
      size={size}
      isCreatedByUser={false}
      chatGptLabel={undefined}
      modelLabel={undefined}
    />
  );
}
