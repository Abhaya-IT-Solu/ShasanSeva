1. After logging in as a user, clicking the homepage logo or borwse schemes, it still redirects to the user dashboard, instead of the user homepage. (check this)

2. Note: pnpm db:generate / db:push are broken due to drizzle-kit v0.30 failing to resolve ./users.js ESM imports.


// 2 March 2026. 
1. After the admin rejects any document in the order. the user is prompted to resubmit the arder with the updated document. but in that process the old rejected document is still attached to the document and the goes with the order again. that is creating a duplicacy of documnets in the order. 
Also in the order details page of the user. the related translation keys need to be added. 
There are other minor bugs in this workflow that we will get back to, lated on. 