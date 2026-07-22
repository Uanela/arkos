import { ArkosGateway } from "arkos/websockets";
import tictactoeGateway from "./gateways/tic-tac-toe.gateway";

const gateway = ArkosGateway({ name: "/" });

gateway.use(tictactoeGateway);

export default gateway;
