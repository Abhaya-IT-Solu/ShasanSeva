# Backend API Plan for Order Resubmission

To allow a user to re-submit an order *without* going through the checkout and payment process again, you need to add a new endpoint to your Node.js/Express backend. 

### Why is this needed?
Currently, when an application is rejected, its status becomes `REJECTED`. The mobile app does not have permission to change the status back to `PAID` or `IN_PROGRESS` because the existing `PATCH /api/orders/:id/status` endpoint requires **Admin access**. 

### The Solution: Create a Resubmit Endpoint
You need to create a dedicated endpoint that allows a *user* to resubmit their own rejected order.

## 1. Endpoint Details

**Method:** `POST`
**Path:** `/api/orders/:id/resubmit`
**Access:** Authenticated User (must be the owner of the order)

## 2. Controller Logic (Node.js/Express Example)

Here is a simplified example of what the logic should look like in your backend controller:

```javascript
// order.controller.js (or similar)

exports.resubmitOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id; // Assuming you have authentication middleware that sets req.user

    // 1. Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // 2. Verify ownership
    if (order.user.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'You do not have permission to modify this order' });
    }

    // 3. Verify it's actually rejected and can be resubmitted
    if (order.status !== 'REJECTED') {
      return res.status(400).json({ success: false, error: 'Only rejected orders can be resubmitted' });
    }

    // 4. Update the status back to 'PAID' (or 'PENDING' depending on your workflow)
    // This makes it show up in the Admin's queue again
    order.status = 'PAID'; 
    order.adminNotes = ""; // Clear out previous rejection reasons if applicable
    
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order resubmitted successfully',
      data: order
    });

  } catch (error) {
    console.error('Error resubmitting order:', error);
    return res.status(500).json({ success: false, error: 'Failed to resubmit order' });
  }
};
```

## 3. Route Configuration

Add the route to your API routes:

```javascript
// order.routes.js (or similar)
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { protect } = require('../middleware/auth'); // Your auth middleware

// ... your existing routes ...

// Add this new route
router.post('/:id/resubmit', protect, orderController.resubmitOrder);

module.exports = router;
```

## 4. Mobile App Implementation

Once you have deployed that backend endpoint, I will add this corresponding function to the mobile app's `OrderService`:

```dart
// lib/data/services/order_service.dart

Future<void> resubmitOrder(String id) async {
  final response = await _apiClient.post('/api/orders/$id/resubmit');
  if (response.data['success'] != true) {
     throw Exception(response.data['error'] ?? 'Failed to resubmit');
  }
}
```

Then we will simply call that method from the `ApplySchemePage` when the user clicks the "I agree and wish to re-submit my application" button!
