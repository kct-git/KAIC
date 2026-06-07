import { useChat } from "@ai-sdk/react";
export default function TestComp() {
  const { input, handleInputChange } = useChat();
  return <input value={input || ""} onChange={handleInputChange} />;
}
