import wrap from "../../api/_netlify-adapter.js";
import handler from "../../api/auth.js";
export default wrap(handler);
export const config = { path: "/api/auth" };
