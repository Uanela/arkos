---
title: Our Favourite Feature On 1.3-beta Yet
authors: [uanela]
tags: [arkosjs, superm7, webpropax, finegrained, swagger, servicehooks]
---

# Our Favourite Feature On 1.3-beta Yet

On September 09, we've launched [**Arkos.js v1.3-beta**](https://www.arkosjs.com/blog/1.3-beta) which was a success, it was a minor update which brought some really handful features to the framework and once again we've ensured to show the world our mission into the JavaScript/TypeScript Backend Development, which is to allow developers to focus on what really matters (The Application Unique Logic) and speed up the development of secure and scalable RESTful APIs.

As a mother has a favourite son, we've identified also our favourite feature on Arkos.js v1.3-beta so far. To tell the truth all of them are good - really really really good - but this one just took our heart.

I am talking about the [**Fine-Grained Access Control**](https://www.arkosjs.com/docs/advanced-guide/fine-grained-access-control), this feature is outrageous believe me, this really does what it says `Fine Grain The Access Control Of Resources On Your Applications` on a really easy and fascinating way.

## The Real-World Problem

Let's say we have `PATCH /api/orders`, and it has statuses where one of them is `Completed` and from this status it must not be changed again no matter what. This makes a lot of sense but what if there was a mistake? We're all mere humans and we all make mistakes - what would make you as developer think that person ordering or drafting the order would not make mistakes?

Should a business lose money or fall off simply because you designed in a way where it does not take into account one of the things that your users do the most? What is it? **Make Mistakes**. But we must also look at the other side of the coin - if we let those users edit/change/update a completed order they may also harm the application logic and worse, the clients' business. 

The question arises: **How Can We Ensure That The Completed Orders Can Be Changed Without Harming The Clients' Business?**

The truth is that not all users must be able to edit a completed order, and I am not talking about simply by separating this permission between the customer and the staff of the business, I am talking only about the staff side. Even among the staff, they must not all be allowed to edit a completed order. Why? Answer these questions:

- Do all of them work with the order at the same status?
- Do all of them have the same responsibilities when dealing with orders?
- Do all of them have the same information about the orders along their different statuses?
- Can we trust all of them to edit an order after it is completed?

The last question seems kind of rude, doesn't it? But it's reality. If your answer was NO at a 1/4 rate then you need to learn how to fine grain the access control of your application to ensure it is secure as the Vatican Apostolic Archives.

## Getting Started

First thing you gotta do is install the latest version of `Arkos.js` or at least `v1.3.1` to have access to the fine-grained access control feature:

```bash
npm install arkos@latest
# or
yarn add arkos@latest
```

## The Order Model Example

Let's start with a simple Order model that has different statuses:

```prisma
// schema.prisma
model Order {
  id          String      @id @default(cuid())
  orderNumber String      @unique
  customerId  String
  status      OrderStatus @default(PENDING)
  totalAmount Float
  items       Json
  completedAt DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  customer Customer @relation(fields: [customerId], references: [id])
}

enum OrderStatus {
  Pending
  Processing
  Shipped
  Delivered
  Completed
  Cancelled
}
```

## Setting Up Fine-Grained Access Control

Now, let's create the order authentication configuration with fine-grained permissions:

```typescript
// src/modules/order/order.auth.ts
import { AuthConfigs } from "arkos/auth";
import { authService } from "arkos/services";

/**
 * Order permissions for e-commerce order management system
 */
export const orderPermissions = {
    /** View all orders regardless of status */
    canViewAll: authService.permission("ViewAll", "order"),
    /** View only active orders (non-completed) */
    canViewActive: authService.permission("ViewActive", "order"),
    /** Create new orders */
    canCreate: authService.permission("Create", "order"),
    /** Update regular order information */
    canUpdate: authService.permission("Update", "order"),
    /** Update completed orders - RESTRICTED PERMISSION */
    canUpdateCompleted: authService.permission("UpdateCompleted", "order"),
    /** Cancel orders */
    canCancel: authService.permission("Cancel", "order"),
    /** Mark orders as completed */
    canComplete: authService.permission("Complete", "order"),
    /** Delete orders (hard delete) */
    canDelete: authService.permission("Delete", "order"),
};

const orderAuthConfigs: AuthConfigs = {
    authenticationControl: {
        // Standard CRUD operations
        ViewAll: true,
        ViewActive: true,
        Create: true,
        Update: true,
        UpdateCompleted: true, // Restricted permission
        Cancel: true,
        Complete: true,
        Delete: true,
    },
    accessControl: {
        ViewAll: {
            roles: ["OrderManager", "Admin"],
            name: "View All Orders",
            description: "View all orders regardless of status",
        },
        ViewActive: {
            roles: ["OrderStaff", "OrderManager", "Admin"],
            name: "View Active Orders",
            description: "View non-completed orders",
        },
        Create: {
            roles: ["OrderStaff", "OrderManager", "Admin"],
            name: "Create Orders",
            description: "Create new orders",
        },
        Update: {
            roles: ["OrderStaff", "OrderManager", "Admin"],
            name: "Update Orders",
            description: "Update regular order information",
        },
        UpdateCompleted: {
            roles: ["OrderManager", "Admin"], // Only managers and admins
            name: "Update Completed Orders",
            description: "Modify orders that have been marked as completed - RESTRICTED",
        },
        Cancel: {
            roles: ["OrderStaff", "OrderManager", "Admin"],
            name: "Cancel Orders",
            description: "Cancel orders",
        },
        Complete: {
            roles: ["OrderManager", "Admin"],
            name: "Complete Orders",
            description: "Mark orders as completed",
        },
        Delete: {
            roles: ["Admin"], // Only admins can delete
            name: "Delete Orders",
            description: "Permanently delete orders",
        },
    },
};

export default orderAuthConfigs;
```

Notice how we've created a specific `UpdateCompleted` permission that is only assigned to `OrderManager` and `Admin` roles. This is the key to solving our problem - regular `OrderStaff` can update orders, but they cannot update orders that have been completed.

## The Magic Happens in Interceptor Middlewares

Now comes the beautiful part. We'll use Arkos.js interceptor middlewares to implement the business logic that protects completed orders while still allowing authorized users to modify them when necessary:

```typescript
// src/modules/order/order.middlewares.ts
import { AppError } from "arkos/error-handler";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { orderPermissions } from "./order.auth";
import orderService from "./order.service";

export const beforeUpdateOne = [
    // 1. Check if order exists and get current status
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const orderId = req.params.id;
        
        const order = await orderService.findOne({ id: orderId });
        if (!order) 
            throw new AppError("Order not found", 404);
        
        // Store order in request for next middlewares
        (req as any).currentOrder = order;
        next();
    },
    // 2. Apply fine-grained access control based on order status
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const user = req.user;
        const order = (req as any).currentOrder;
        
        // If order is completed, check special permission
        if (order.status === 'Completed') {
            const canUpdateCompleted = await orderPermissions.canUpdateCompleted(user);
            if (!canUpdateCompleted) 
                throw new AppError(
                    "You don't have permission to modify completed orders. Please contact your manager.", 
                    403,
                    {},
                    "CannotUpdateCompletedOrder"
                );
        } else {
            // For non-completed orders, check regular update permission
            const canUpdate = await orderPermissions.canUpdate(user);
            if (!canUpdate) 
                throw new AppError(
                    "You don't have permission to update orders", 
                    403
                );
        }
        
        next();
    },
    // 3. Additional business logic validation
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const order = (req as any).currentOrder;
        const updateData = req.body;
        // Prevent changing status from Completed to anything else without proper permission
        if (order.status === 'Completed' && updateData.status && updateData.status !== 'Completed') {
            const canUpdateCompleted = await orderPermissions.canUpdateCompleted(req.user);
            
            if (!canUpdateCompleted) {
                throw new AppError(
                    "Cannot change status of completed orders", 
                    403,
                    {},
                    "CannotChangeCompletedOrderStatus"
                );
            }
        }
        
        // If changing status to Completed, check completion permission
        if (updateData.status === 'Completed' && order.status !== 'Completed') {
            const canComplete = await orderPermissions.canComplete(req.user);
            
            if (!canComplete) {
                throw new AppError(
                    "You don't have permission to mark orders as completed", 
                    403
                );
            }
            
            // Auto-set completion timestamp
            req.body.completedAt = new Date();
        }
        
        next();
    }
];

export const afterUpdateOne = [
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
        const updatedOrder = res.locals.data.data;
        const originalOrder = (req as any).currentOrder;
        
        // Log important status changes
        if (originalOrder.status !== updatedOrder.status) {
            console.log(`Order ${updatedOrder.id} status changed from ${originalOrder.status} to ${updatedOrder.status} by user ${req.user.id}`);
            
            // Send notifications based on status change
            if (updatedOrder.status === 'Completed') {
                // Notify customer about order completion
                notificationService
                    .notifyCustomer(updatedOrder.customerId, {
                        type: 'order_completed',
                        orderId: updatedOrder.id,
                        orderNumber: updatedOrder.orderNumber
                    })
                    .catch(console.error);
            }
        }
        
        next();
    }
];
```

:::tip
Have you noticed that we've defined the interceptors functions right inside the arrays, this is not considered a good practire in Express, we've done this here only for an example, you'd better define those functions on another file, a helper functions file for example and them put them here as chain inside these arrays. 
:::

## Why Initialize Permissions at Module Level?

Notice how we initialize all permissions using `authService.permission()` at the top level of our auth file. This is crucial because:

1. **Auto-Documentation**: Arkos.js automatically discovers all permissions created with `authService.permission()` and makes them available through the `/api/auth-actions` endpoint. This helps frontend developers understand what actions are available in your application.

2. **Consistency**: It ensures all permissions are properly registered and available for inspection, making your application more maintainable.

## The Power of Fine-Grained Control

This approach gives you several powerful benefits:

### 1. **Granular Security**
Different staff members can have different levels of access:
- `OrderStaff`: Can update pending/processing orders
- `OrderManager`: Can update any order, including completed ones
- `Admin`: Full access to all operations

### 2. **Flexible Business Logic**
You can easily add more complex rules, such as:
- Only allow completed order updates within 24 hours
- Require additional approval for high-value order modifications
- Restrict certain fields from being changed after completion

## A Real-World Scenario

Let's say you have these users:
- **Cacilda** (OrderStaff): Can process orders but not modify completed ones
- **Sheuzia** (OrderManager): Can fix mistakes in completed orders
- **Admin** (Admin): Can do everything

When Cacilda tries to update a completed order:
```json
{
  "error": "You don't have permission to modify completed orders. Please contact your manager.",
  "statusCode": 403,
  "errorCode": "CannotUpdateCompletedOrder"
}
```

When Mike updates the same order, it works and gets logged:
```
User sheuzia123 (OrderManager) is modifying completed order ord_abc123
Order ord_abc123 status changed from Completed to Processing by user sheuzia123
```

## Conclusion

Fine-Grained Access Control in Arkos.js v1.3-beta solves real business problems with elegant, maintainable code. Instead of building complex custom authorization logic, you can focus on your application's unique business rules while Arkos handles the heavy lifting.

The combination of `authService.permission()` for defining granular permissions and interceptor middlewares for implementing business logic creates a powerful, secure, and maintainable system that grows with your application's needs.

Your application becomes secure as the Vatican Apostolic Archives, but with the flexibility to handle the human element - mistakes happen, and when they do, the right people can fix them without compromising security.
