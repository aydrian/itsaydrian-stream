import { ToastContainer } from "react-toastify";
import { ChatProvider } from "@context/chat";
import { Chat } from "@components/Chat";

export default function ChatPage() {
  return (
    <ChatProvider channels={["itsaydrian"]}>
      <Chat />
      <ToastContainer closeButton={false} position="bottom-right" />
    </ChatProvider>
  );
}
