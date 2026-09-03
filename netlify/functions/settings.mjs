import wrap from "../../api/_netlify-adapter.js";
import handler from "../../api/settings.js";
export default wrap(handler);
export const config = { path: "/api/settings" };
