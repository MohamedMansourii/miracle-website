import wrap from "../../api/_netlify-adapter.js";
import handler from "../../api/orders.js";
export default wrap(handler);
export const config = { path: "/api/orders" };
