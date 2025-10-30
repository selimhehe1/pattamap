# 🛡️ Admin Guide: Establishment Owner Management

**Administrator's Guide to Managing Establishment Ownership**

This guide covers everything you need to know about reviewing owner accounts, assigning establishments, managing permissions, and maintaining system integrity.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Account Approval Process](#account-approval-process)
3. [Assigning Ownership](#assigning-ownership)
4. [Managing Permissions](#managing-permissions)
5. [Best Practices](#best-practices)
6. [Security Guidelines](#security-guidelines)
7. [Troubleshooting](#troubleshooting)
8. [Audit & Compliance](#audit--compliance)

---

## Overview

### Your Responsibilities

As an administrator managing establishment ownership, you are responsible for:

- ✅ **Vetting** new establishment owner accounts
- ✅ **Assigning** establishments to verified owners
- ✅ **Managing** permissions and roles
- ✅ **Monitoring** system usage for abuse
- ✅ **Maintaining** data integrity
- ✅ **Responding** to owner support requests

### System Access

**Navigation**:
```
Admin Panel → Establishment Owners tab
```

**Required Role**: `admin` (moderators do not have access)

**Key Features**:
- View all establishments with owner counts
- Filter by ownership status (All / With Owners / Without Owners)
- Assign/edit/remove ownership
- Configure granular permissions
- Track assignment history

---

## Account Approval Process

### Step 1: Identify Pending Accounts

**Current Method** (v10.1):
1. Navigate to **Admin Panel → Users**
2. Look for users with `account_type='establishment_owner'`
3. These accounts are automatically created but not yet assigned establishments

**Future Enhancement** (v10.2):
- Dedicated "Pending Accounts" tab
- Email notifications for new registrations
- Approval/rejection workflow

### Step 2: Verify Legitimacy

Before approving, verify:

#### Business Documentation
- [ ] Business license or registration
- [ ] Proof of ownership (lease agreement, deed)
- [ ] Tax identification number
- [ ] Contact information verification

#### Identity Verification
- [ ] Government-issued ID
- [ ] Phone number confirmation
- [ ] Email verification
- [ ] Social media presence (optional but helpful)

#### Red Flags ⚠️
- Multiple accounts from same person
- Fake or suspicious documentation
- Email from temporary/disposable services
- No verifiable business presence
- Requests for establishments they don't own

### Step 3: Contact the Applicant

**Email Template**:
```
Subject: PattaMap Establishment Owner Account - Verification Required

Dear [Pseudonym],

Thank you for registering as an Establishment Owner on PattaMap.

To complete your application, please provide:
1. Proof of business ownership (license, registration, lease)
2. Government-issued ID for verification
3. List of establishments you wish to manage

You can reply to this email with the documents attached or contact us via [contact method].

We typically process applications within 48 hours of receiving complete documentation.

Best regards,
PattaMap Admin Team
```

### Step 4: Approve or Reject

**If Approved**:
1. Keep account active (`is_active: true`)
2. Proceed to assignment process (see next section)
3. Send welcome email with next steps

**If Rejected**:
1. Set account to inactive (`is_active: false`)
2. Send rejection email explaining reason
3. Optionally delete account if fraudulent

---

## Assigning Ownership

### Step-by-Step Assignment

#### 1. Access Establishment Owners Panel

```
Admin Panel → Establishment Owners
```

#### 2. Find the Establishment

Use the search or filter tabs:
- **All**: View all establishments
- **With Owners**: Establishments already assigned
- **Without Owners**: Unassigned establishments

#### 3. Open Establishment Modal

Click on the establishment card. You'll see:
- Establishment details
- Current owners list (if any)
- "Assign New Owner" button

#### 4. Search for Owner

1. Click **"Assign New Owner"**
2. Type owner's pseudonym or email in search box
3. System automatically filters by `account_type='establishment_owner'`
4. Select user from autocomplete results

💡 **Tip**: If user doesn't appear, verify they have `account_type='establishment_owner'`

#### 5. Configure Ownership

**Select Role**:
- **👑 Owner**: Full control, primary business owner
- **⚙️ Manager**: Limited control, venue manager

**Set Permissions** (5 checkboxes):
- **📝 Can Edit Info**: Name, address, description, hours
- **💰 Can Edit Pricing**: Ladydrink, barfine, rooms
- **📸 Can Edit Photos**: Logo and venue images
- **👥 Can Edit Employees**: Roster management
- **📊 Can View Analytics**: Performance metrics

**Default Presets**:
- **Owner Role**: All enabled except employees
- **Manager Role**: Info, photos, analytics only

#### 6. Confirm Assignment

1. Review settings
2. Click **"Assign Owner"**
3. System validates:
   - User exists and has correct account type
   - No duplicate assignment exists
   - All required fields filled
4. Success message appears
5. Owner is added to the list

#### 7. Notify Owner

Send confirmation email:
```
Subject: You've Been Assigned to [Establishment Name]

Dear [Pseudonym],

You have been assigned as [Owner/Manager] of [Establishment Name] on PattaMap.

Your permissions:
- [List enabled permissions]

Access your dashboard: [Link to /my-establishments]

Best regards,
PattaMap Admin Team
```

---

## Managing Permissions

### Editing Existing Ownership

**To Modify Permissions**:
1. Open establishment modal
2. Find owner in "Current Owners" list
3. Click **"Edit Permissions"**
4. Adjust role or permission checkboxes
5. Click **"Save Changes"**

**Changes take effect immediately** - no confirmation needed.

### Removing Ownership

**When to Remove**:
- Owner sells establishment
- Owner requests removal
- Ownership transfer to new person
- Account compromise or abuse

**How to Remove**:
1. Open establishment modal
2. Find owner in list
3. Click **"Remove Owner"** (🗑️ icon)
4. Confirm action in dialog
5. Owner loses access immediately

⚠️ **Important**: This action is irreversible. Owner's access is revoked instantly.

### Permission Guidelines

#### 📝 Can Edit Info
**Grant to**: All owners and managers
**Rationale**: Basic information updates are essential for keeping listings current
**Risk**: Low - changes are visible and traceable

#### 💰 Can Edit Pricing
**Grant to**: Owners only, trusted managers
**Rationale**: Pricing affects revenue and customer expectations
**Risk**: Medium - incorrect pricing can cause disputes

#### 📸 Can Edit Photos
**Grant to**: Most owners and managers
**Rationale**: Visual updates improve engagement
**Risk**: Low - inappropriate images are reported and removed

#### 👥 Can Edit Employees
**Grant to**: Verified owners only, after additional vetting
**Rationale**: Employee data is sensitive and requires proper authorization
**Risk**: High - privacy concerns, potential for abuse
**Recommendation**: Require extra documentation before granting

#### 📊 Can View Analytics
**Grant to**: All owners and managers
**Rationale**: Performance data helps owners optimize their business
**Risk**: Very low - read-only access

---

## Best Practices

### Onboarding New Owners

**Week 1**:
- [ ] Verify documentation
- [ ] Approve account
- [ ] Assign first establishment with conservative permissions
- [ ] Send welcome email with guide link
- [ ] Schedule follow-up check-in

**Week 2-4**:
- [ ] Monitor usage patterns
- [ ] Review changes made
- [ ] Respond to questions promptly
- [ ] Consider expanding permissions if appropriate

### Regular Maintenance

**Weekly**:
- Check for new owner registrations
- Review pending approval queue
- Monitor system logs for suspicious activity

**Monthly**:
- Audit ownership assignments
- Review permission settings
- Clean up inactive accounts
- Update documentation as needed

**Quarterly**:
- Survey owner satisfaction
- Analyze system usage metrics
- Plan improvements based on feedback

### Communication Standards

**Response Times**:
- Urgent issues: 4 hours
- Normal requests: 24 hours
- Complex issues: 48 hours

**Tone**:
- Professional and friendly
- Clear and concise
- Patient with non-technical users
- Firm but polite with policy enforcement

---

## Security Guidelines

### Account Verification

**Required for All Owners**:
1. ✅ Email verification (automatic)
2. ✅ Identity documents (manual review)
3. ✅ Business documentation (manual review)
4. ✅ Contact information (phone or physical address)

**Additional for High-Risk Scenarios**:
- Multiple establishments: Extra documentation per venue
- High-value establishments: In-person verification
- Suspicious patterns: Enhanced background checks

### Preventing Abuse

**Watch for**:
- Rapid creation of multiple accounts
- Same documentation used for different accounts
- Unusual editing patterns (bulk changes, off-hours)
- Customer complaints about incorrect information
- Attempts to claim competitors' establishments

**Red Flag Actions**:
```
🚨 Immediate Investigation Required:
- Deleting competitor information
- Falsifying pricing data
- Uploading inappropriate content
- Attempting to access unauthorized establishments
- Repeated permission violation attempts
```

### Incident Response

**If Abuse Detected**:
1. **Suspend Access**: Set `is_active: false` immediately
2. **Document Evidence**: Screenshot violations, save logs
3. **Notify Team**: Alert other admins
4. **Investigate**: Review full history
5. **Take Action**: Remove ownership, ban account, or warn
6. **Follow Up**: Restore legitimate access, update policies

### Data Protection

**PII Handling**:
- Store minimal personal information
- Never share owner data with third parties
- Use encrypted connections (HTTPS)
- Log access to sensitive data
- Comply with GDPR/privacy regulations

**Audit Trail**:
- Every assignment logged with `assigned_by` and `assigned_at`
- Permission changes tracked
- Removal actions recorded
- Regular audit log reviews

---

## Troubleshooting

### Common Issues

#### Issue: Owner Can't Access Dashboard

**Symptoms**: Owner sees "Access Denied" or "No establishments yet"

**Diagnosis**:
1. Check `account_type='establishment_owner'`
2. Verify account is active (`is_active: true`)
3. Confirm ownership assignment exists
4. Check browser console for errors

**Solutions**:
- Update account type if incorrect
- Activate account if suspended
- Assign establishment if missing
- Clear browser cache/cookies

#### Issue: Owner Can't Edit Fields

**Symptoms**: Edit button disabled, fields read-only

**Diagnosis**:
1. Check owner's permissions
2. Verify establishment assignment
3. Review role (Owner vs Manager)

**Solutions**:
- Update permissions in admin panel
- Change role if needed
- Re-assign ownership if corrupted

#### Issue: Duplicate Assignment Error

**Symptoms**: Error message "User is already an owner of this establishment"

**Diagnosis**:
- Database already has user-establishment pair

**Solutions**:
- Edit existing assignment instead
- Remove old assignment first
- Check for typos in user selection

#### Issue: User Not Found in Search

**Symptoms**: Autocomplete shows no results

**Diagnosis**:
1. Check account type: Must be `establishment_owner`
2. Verify account exists and is active
3. Check spelling of pseudonym/email

**Solutions**:
- Update account type in Users panel
- Activate account if suspended
- Try alternative search terms

---

## Audit & Compliance

### Logging

**Automatic Logs**:
- All ownership assignments: `assigned_by`, `assigned_at`
- Permission changes: `updated_at`
- Removal actions: Logged to audit trail
- Failed authentication: Logged by auth system

**Manual Logs** (Recommended):
- Keep spreadsheet of:
  - Owner name
  - Establishments assigned
  - Date approved
  - Verification documents
  - Notes

### Compliance Checklist

**Before Assigning Ownership**:
- [ ] Documentation verified
- [ ] Identity confirmed
- [ ] Business legitimacy checked
- [ ] No red flags present
- [ ] Appropriate permissions set

**Monthly Review**:
- [ ] All active owners still legitimate
- [ ] No suspicious activity patterns
- [ ] Permissions still appropriate
- [ ] Documentation on file
- [ ] No unresolved complaints

**Quarterly Audit**:
- [ ] Full system audit
- [ ] Review all assignments
- [ ] Check for dormant accounts
- [ ] Update security policies
- [ ] Report to management

### Reporting

**Generate Reports**:
```sql
-- Total owners by status
SELECT COUNT(*) as total_owners
FROM establishment_owners
GROUP BY owner_role;

-- Assignments by admin
SELECT assigned_by, COUNT(*) as assignments
FROM establishment_owners
GROUP BY assigned_by;

-- Recent assignments
SELECT * FROM establishment_owners
WHERE assigned_at > NOW() - INTERVAL '30 days'
ORDER BY assigned_at DESC;
```

---

## Quick Reference

### Essential Shortcuts

| Action | Path |
|--------|------|
| View Owners | Admin Panel → Establishment Owners |
| Assign Owner | Click establishment → Assign New Owner |
| Edit Permissions | Click establishment → Edit icon on owner |
| Remove Owner | Click establishment → Remove icon on owner |
| View Users | Admin Panel → Users |

### Permission Matrix

| Role | Info | Pricing | Photos | Employees | Analytics |
|------|------|---------|--------|-----------|-----------|
| Owner (Default) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Manager (Default) | ✅ | ❌ | ✅ | ❌ | ✅ |
| Custom | Configure individually |

### Emergency Procedures

**Account Compromise**:
1. Suspend account immediately
2. Remove all ownership assignments
3. Change password
4. Investigate breach
5. Notify owner

**Data Breach**:
1. Document incident
2. Notify affected parties
3. Review logs
4. Patch vulnerability
5. File incident report

---

## Resources

### Documentation
- **Technical Docs**: `docs/features/ESTABLISHMENT_OWNERS.md`
- **Owner Guide**: `docs/guides/OWNER_GUIDE.md`
- **API Docs**: http://localhost:8080/api-docs

### Support Contacts
- **Lead Admin**: [contact info]
- **Technical Support**: [contact info]
- **Legal/Compliance**: [contact info]

### Training Materials
- Video tutorials (coming soon)
- Onboarding checklist (this guide)
- Policy documents (as needed)

---

**You are the guardian of system integrity.**

Your careful management ensures establishment owners have the tools they need while protecting the platform and its users from abuse.

**Last Updated**: January 2025
**Version**: v10.1
**Status**: ✅ Production Ready
