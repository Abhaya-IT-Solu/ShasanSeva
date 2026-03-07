

1. Note: pnpm db:generate / db:push are broken due to drizzle-kit v0.30 failing to resolve ./users.js ESM imports.
   - Update: db:generate works via `tsx node_modules/drizzle-kit/bin.cjs generate`. db:push works but has schema drift issues (drops indexes, changes constraint names, truncates locale column from varchar(5) to varchar(10)). Need to align Drizzle schema with actual DB to fix drift before using db:push safely.

2. Adding a cancel order or back buttons to the payment page of the apply to scheme page flow. [DONE]

3. Adding a reciept feature. when the payment is done and order is completed. the system should generrate a reciept and attach it to the order. the user can downlaod the reciept after the order is successfully created or in the order details page as well. and the reciept should be visible in the admin dashboard as well. [DONE - user/order detail side. Admin dashboard pending.]

4. handling order duplicacy with failex payments. [DONE]