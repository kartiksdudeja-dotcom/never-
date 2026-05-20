// @ts-ignore
import { io } from "socket.io-client";

const BACKEND_URL = "http://10.42.0.1:5000";

export const socket = io(BACKEND_URL, {
  transports: ["websocket"],
});
