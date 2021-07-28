import { useTheme } from '@chakra-ui/react';
import { ChatWidget } from '@paescuj/chat-widget';

export default function Chat({
  papercupsToken,
  papercupsUrl,
  chatWidgetUrl,
  customer,
}) {
  const theme = useTheme();
  return (
    <ChatWidget
      accountId={papercupsToken}
      primaryColor={theme.colors.blue[500]}
      emailInputPlaceholder="Bitte geben Sie Ihre E-Mail-Adresse an"
      newMessagesNotificationText="Neue Nachricht(en) ansehen"
      baseUrl={papercupsUrl}
      iframeUrlOverride={chatWidgetUrl}
      customer={customer}
      disableAnalyticsTracking
    />
  );
}
