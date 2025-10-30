# 📝 Form Validation Integration Guide

This guide shows how to integrate real-time validation into forms using `useFormValidation` hook and `FormField` component.

## 🎯 Benefits

- ✅ Real-time validation (onChange + onBlur)
- ✅ Visual feedback (✓ valid, ✗ invalid, ⏳ validating)
- ✅ Contextual error messages
- ✅ Character counters
- ✅ WCAG AA compliant

## 📦 Files Created

1. `src/hooks/useFormValidation.ts` - Validation logic hook
2. `src/components/Common/FormField.tsx` - Enhanced input component

## 🔧 Integration Example

### Step 1: Import Dependencies

```typescript
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation';
import FormField from '../Common/FormField';
```

### Step 2: Define Validation Rules

```typescript
const validationRules: ValidationRules<typeof formData> = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s]+$/,
    message: (field, rule, value) => {
      if (rule === 'required') return 'Employee name is required';
      if (rule === 'minLength') return 'Name must be at least 2 characters';
      if (rule === 'maxLength') return 'Name cannot exceed 100 characters';
      if (rule === 'pattern') return 'Name can only contain letters and spaces';
      return 'Invalid name';
    }
  },
  age: {
    required: false,
    min: 18,
    max: 80,
    message: (field, rule) => {
      if (rule === 'min') return 'Employee must be at least 18 years old';
      if (rule === 'max') return 'Age cannot exceed 80';
      return 'Invalid age';
    }
  },
  nationality: {
    required: true,
    message: 'Please select a nationality'
  },
  description: {
    maxLength: 500,
    message: 'Description cannot exceed 500 characters'
  }
};
```

### Step 3: Initialize Validation Hook

```typescript
const {
  errors,
  fieldStatus,
  handleFieldChange,
  handleFieldBlur,
  validateForm,
  isFormValid
} = useFormValidation(formData, validationRules, {
  validateOnChange: true,
  validateOnBlur: true,
  debounceDelay: 500
});
```

### Step 4: Update Input Handlers

```typescript
const handleInputChange = (fieldName: string, value: any) => {
  // Update form data
  setFormData(prev => ({
    ...prev,
    [fieldName]: value
  }));

  // Trigger validation
  handleFieldChange(fieldName, value);
};

const handleInputBlur = (fieldName: string, value: any) => {
  handleFieldBlur(fieldName, value);
};
```

### Step 5: Replace Input with FormField

**Before:**
```tsx
<div>
  <label>Employee Name</label>
  <input
    name="name"
    value={formData.name}
    onChange={handleInputChange}
    className="input-nightlife"
  />
  {errors.name && <span className="error">{errors.name}</span>}
</div>
```

**After:**
```tsx
<FormField
  label="Employee Name"
  name="name"
  value={formData.name}
  error={errors.name}
  status={fieldStatus.name}
  onChange={(e) => handleInputChange('name', e.target.value)}
  onBlur={(e) => handleInputBlur('name', e.target.value)}
  required
  maxLength={100}
  showCounter
  helpText="Enter the employee's full name"
/>
```

### Step 6: Update Form Submit

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate entire form before submit
  if (!validateForm()) {
    toast.error('Please fix form errors before submitting');
    return;
  }

  // ... submit logic
};
```

## 🎨 Styling

FormField component includes inline styles matching the nightlife theme. No additional CSS needed!

## 📱 Mobile Support

- Touch targets: ≥44px (WCAG AA compliant)
- Responsive font sizes
- Optimized spacing for small screens

## ♿ Accessibility Features

- `aria-invalid` on invalid fields
- `aria-required` on required fields
- `aria-describedby` linking errors/help text
- `role="alert"` on error messages
- `aria-live="polite"` on character counters
- Keyboard navigation support

## 🧪 Testing

```typescript
// Check if form is valid
console.log('Is form valid:', isFormValid);

// Get all errors
console.log('Errors:', errors);

// Check specific field
console.log('Name status:', fieldStatus.name);
```

## 📊 Validation Status States

- `untouched`: Field not yet interacted with
- `validating`: Validation in progress (debounced)
- `valid`: Field passed all validations ✓
- `invalid`: Field has errors ✗

## 🚀 Advanced: Custom Validation

```typescript
email: {
  required: true,
  custom: (value) => {
    if (!value.includes('@')) return 'Invalid email format';
    if (value.endsWith('.test')) return 'Test emails not allowed';
    return true; // Valid
  },
  message: 'Please enter a valid email address'
}
```

## 🔄 Form Reset

```typescript
// Reset validation state
resetValidation();

// Reset form data
setFormData(initialFormData);
```

## 📝 Complete Example Files to Update

### Priority 1 (High Impact):
1. ✅ `EmployeeForm.tsx` - Employee creation/edit
2. ✅ `EstablishmentForm.tsx` - Establishment creation/edit
3. ✅ `LoginForm.tsx` - User authentication

### Priority 2 (Medium Impact):
4. `RegisterForm.tsx` - User registration
5. Admin forms (comments, consumables, etc.)

## 🎯 Expected Results

**Before:**
- Errors shown only on submit
- Generic error messages
- No visual feedback during typing
- Users unsure if input is correct

**After:**
- Real-time feedback as user types
- Specific, helpful error messages
- ✓/✗ visual indicators
- Character counters where applicable
- Better UX, fewer form errors

---

**Created:** 2025-01-05
**Last Updated:** 2025-01-05
**Status:** ✅ Ready for integration
