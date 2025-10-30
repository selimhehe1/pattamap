# Notification i18n Keys Catalog

**Total**: 35 keys × 6 languages (EN/TH/RU/CN/FR/HI) = 210 translations

## Key Structure

All notification keys follow this pattern:
```typescript
i18n_key: 'notifications.keyName'
i18n_params: { param1, param2, ... }
```

Frontend will use `t(i18n_key, i18n_params)` to format the message based on user's language.

---

## 1. Verification System (5 keys)

### notifications.newVerificationRequest
- **Params**: `{ employeeName: string }`
- **EN**: "{{employeeName}} submitted a verification request. Please review."
- **Recipient**: Admins
- **Trigger**: When employee submits verification request

### notifications.verificationSubmitted
- **Params**: `{ employeeName: string }`
- **EN**: "Your verification request for {{employeeName}} has been submitted. An admin will review it soon."

### notifications.verificationApproved
- **Params**: `{ employeeName: string }`
- **EN**: "Congratulations! Your verified badge for {{employeeName}} has been approved by an admin."

### notifications.verificationRejected
- **Params**: `{ employeeName: string, reason: string }`
- **EN**: "Your verification request for {{employeeName}} was rejected. Reason: {{reason}}"

### notifications.verificationRevoked
- **Params**: `{ employeeName: string, reason: string }`
- **EN**: "Your verified badge for {{employeeName}} has been revoked by an admin. Reason: {{reason}}"

---

## 2. VIP System (4 keys)

### notifications.vipPurchaseConfirmed
- **Params**: `{ tier: string, duration: number, price: number }`
- **EN**: "Your VIP {{tier}} subscription ({{duration}} days) has been confirmed. Amount: {{price}} THB. Pending admin verification."

### notifications.vipPaymentVerified
- **Params**: `{ tier: string, expiresAt: string }` (ISO date string)
- **EN**: "Congratulations! Your VIP {{tier}} subscription is now active until {{expiresAt, date}}. Enjoy your exclusive benefits!"

### notifications.vipPaymentRejected
- **Params**: `{ tier: string, reason: string }`
- **EN**: "Your VIP {{tier}} payment has been rejected. Reason: {{reason}}. Please contact support or try again."

### notifications.vipSubscriptionCancelled
- **Params**: `{ tier: string, reason: string }`
- **EN**: "Your VIP {{tier}} subscription has been cancelled. Reason: {{reason}}. You can purchase a new subscription anytime."

---

## 3. Edit Proposals (3 keys)

### notifications.editProposalSubmitted
- **Params**: `{ proposerName: string, entityType: string, entityName: string }`
- **EN**: "{{proposerName}} submitted an edit proposal for {{entityType}} \"{{entityName}}\". Please review."

### notifications.editProposalApproved
- **Params**: `{ entityType: string, entityName: string }`
- **EN**: "Great news! Your edit proposal for {{entityType}} \"{{entityName}}\" has been approved and applied."

### notifications.editProposalRejected
- **Params**: `{ entityType: string, entityName: string, reason: string }`
- **EN**: "Your edit proposal for {{entityType}} \"{{entityName}}\" was rejected. Reason: {{reason}}"

---

## 4. Establishment Owners (3 keys)

### notifications.establishmentOwnerAssigned
- **Params**: `{ role: string, establishmentName: string }`
- **EN**: "You have been assigned as {{role}} of \"{{establishmentName}}\". You can now manage this establishment from your dashboard."

### notifications.establishmentOwnerRemoved
- **Params**: `{ establishmentName: string }`
- **EN**: "Your access to manage \"{{establishmentName}}\" has been removed. Contact an administrator if you have questions."

### notifications.establishmentOwnerPermissionsUpdated
- **Params**: `{ establishmentName: string, updatedPermissions: Record<string, boolean> }`
- **EN**: "Your permissions for \"{{establishmentName}}\" have been updated."
- **Note**: Frontend will format `updatedPermissions` object as a list

---

## 5. Moderation - Comment Removal (1 key)

### notifications.commentRemoved
- **Params**: `{ entityType: string, entityName: string, reason: string }`
- **EN**: "Your comment on {{entityType}} \"{{entityName}}\" was removed by a moderator. Reason: {{reason}}"

---

## 6. Ownership Requests (4 keys)

### notifications.newOwnershipRequest
- **Params**: `{ requesterPseudonym: string, establishmentName: string }`
- **EN**: "{{requesterPseudonym}} has requested ownership of {{establishmentName}}"

### notifications.ownershipRequestSubmitted
- **Params**: `{ establishmentName: string }`
- **EN**: "Your ownership request for {{establishmentName}} has been submitted. Admins will review it shortly."

### notifications.ownershipRequestApproved
- **Params**: `{ establishmentName: string }`
- **EN**: "Your request for {{establishmentName}} has been approved! You can now manage this establishment."

### notifications.ownershipRequestRejected
- **Params**: `{ establishmentName: string, adminNotes: string }`
- **EN**: "Your request for {{establishmentName}} has been rejected.{{#if adminNotes}} Reason: {{adminNotes}}{{/if}}"

---

## 7. Moderation - Content Approval/Rejection (6 keys)

### notifications.employeeApproved
- **Params**: `{ contentType: string, contentName: string }`
- **EN**: "Your {{contentType}} \"{{contentName}}\" has been approved and is now visible to everyone!"

### notifications.employeeRejected
- **Params**: `{ contentType: string, reason: string }`
- **EN**: "Your {{contentType}} was rejected. Reason: {{reason}}"

### notifications.establishmentApproved
- **Params**: `{ contentType: string, contentName: string }`
- **EN**: "Your {{contentType}} \"{{contentName}}\" has been approved and is now visible to everyone!"

### notifications.establishmentRejected
- **Params**: `{ contentType: string, reason: string }`
- **EN**: "Your {{contentType}} was rejected. Reason: {{reason}}"

### notifications.commentApproved
- **Params**: `{ contentType: string, contentName: string }`
- **EN**: "Your {{contentType}} \"{{contentName}}\" has been approved and is now visible to everyone!"

### notifications.commentRejected
- **Params**: `{ contentType: string, reason: string }`
- **EN**: "Your {{contentType}} was rejected. Reason: {{reason}}"

---

## 8. Social Notifications (4 keys)

### notifications.commentReply
- **Params**: `{ replierName: string, employeeName: string }`
- **EN**: "{{replierName}} replied to your comment on {{employeeName}}'s profile"

### notifications.commentMention
- **Params**: `{ mentionerName: string, employeeName: string }`
- **EN**: "{{mentionerName}} mentioned you in a comment on {{employeeName}}'s profile"

### notifications.newFavorite
- **Params**: `{ favoritedByName: string, employeeName: string }`
- **EN**: "{{favoritedByName}} added you ({{employeeName}}) to their favorites!"

### notifications.favoriteAvailable
- **Params**: `{ employeeName: string, establishmentName: string }`
- **EN**: "Your favorite {{employeeName}} is now available{{#if establishmentName}} at {{establishmentName}}{{/if}}"

---

## 9. Employee Updates (3 keys)

### notifications.employeeProfileUpdated
- **Params**: `{ employeeName: string }`
- **EN**: "{{employeeName}} updated their profile information"

### notifications.employeePhotosUpdated
- **Params**: `{ employeeName: string }`
- **EN**: "{{employeeName}} added new photos"

### notifications.employeePositionChanged
- **Params**: `{ employeeName: string }`
- **EN**: "{{employeeName}} changed positions"

---

## 10. Admin/Moderator Notifications (2 keys)

### notifications.newContentPending
- **Params**: `{ submitterName: string, contentType: string, contentName: string }`
- **EN**: "{{submitterName}} submitted a new {{contentType}}: \"{{contentName}}\""

### notifications.newReport
- **Params**: `{ reportReason: string, reportedContent: string }`
- **EN**: "New report: \"{{reportReason}}\" on {{reportedContent}}"

---

## Translation Guidelines

1. **Preserve placeholders**: `{{variableName}}` must remain exactly as-is
2. **Respect context**: Some params may be empty strings (e.g., `establishmentName`, `adminNotes`)
3. **Formality levels**:
   - TH: Polite register (ครับ/ค่ะ)
   - RU: Formal "вы" (you)
   - CN: Standard Mandarin
   - FR: Formal "vous"
   - HI: Respectful register
4. **Emojis**: Keep emojis in titles if culturally appropriate
5. **Date formatting**: `{{expiresAt, date}}` will be handled by i18n library
6. **Conditional text**: Use `{{#if variable}}...{{/if}}` syntax where needed
