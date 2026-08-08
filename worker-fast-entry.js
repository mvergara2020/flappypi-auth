import appWorker from "./worker-app.js";
import { routeLocalFastShop } from "./shop-local-fast.worker.js";

export default {
  async fetch(request, env, ctx) {
    const fastShopResponse = routeLocalFastShop(request, env, new URL(request.url));
    if (fastShopResponse) return fastShopResponse;
    return appWorker.fetch(request, env, ctx);
  },

  async queue(batch, env, ctx) {
    return appWorker.queue(batch, env, ctx);
  }
};
