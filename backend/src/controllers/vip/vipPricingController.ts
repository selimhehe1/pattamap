/**
 * VIP Pricing Controller
 *
 * Handles VIP pricing information endpoints.
 */

import { Request, Response } from 'express';
import { asyncHandler, BadRequestError } from '../../middleware/asyncHandler';
import {
  isValidSubscriptionType,
  getAllPricingOptions,
} from '../../config/vipPricing';

/**
 * GET /api/vip/pricing/:type
 * Returns all pricing options for a subscription type
 */
export const getPricingOptions = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.params;

  // Validate subscription type
  if (!isValidSubscriptionType(type)) {
    throw BadRequestError('Invalid subscription type. Type must be "employee" or "establishment"');
  }

  // Get all pricing options
  const pricingOptions = getAllPricingOptions(type);

  res.status(200).json({
    success: true,
    type,
    pricing: pricingOptions,
  });
});
