# RevenueCat Setup Guide

This guide will help you set up RevenueCat properly for both development and production environments.

## Prerequisites

1. **RevenueCat Account**: Sign up at [revenuecat.com](https://revenuecat.com)
2. **App Store Connect Account**: For iOS in-app purchases
3. **Google Play Console Account**: For Android in-app purchases

## Configuration Steps

### 1. RevenueCat Dashboard Setup

1. **Create a new app** in RevenueCat dashboard
2. **Add your app's bundle ID**:
   - iOS: `com.dimpolanguages`
   - Android: `com.dimpolanguages`
3. **Configure API Keys**:
   - Copy the API keys from RevenueCat dashboard
   - Update them in `config/revenueCat.ts`

### 2. Product Configuration

#### In RevenueCat Dashboard:
1. Go to **Products** section
2. Add the following products:
   - `premium_monthly` (Non-consumable)
   - `premium_yearly` (Non-consumable)
   - `premium_monthly_sub` (Subscription)
   - `premium_yearly_sub` (Subscription)

#### In App Store Connect (iOS):
1. Go to **My Apps** → **Dimpo Languages**
2. Navigate to **Features** → **In-App Purchases**
3. Create products with the same IDs as in RevenueCat
4. Set pricing and descriptions
5. Submit for review

#### In Google Play Console (Android):
1. Go to **Monetization** → **Products** → **In-app products**
2. Create products with the same IDs as in RevenueCat
3. Set pricing and descriptions
4. Activate the products

### 3. Offering Configuration

1. In RevenueCat dashboard, go to **Offerings**
2. Create a **Default** offering
3. Add the products to the offering
4. Set the offering as **Current**

### 4. Development Setup

#### iOS Development:
1. **StoreKit Configuration File**: 
   - The file `ios/DimpoLanguages/Configuration.storekit` is already created
   - Open it in Xcode to configure test products
   - Update product IDs to match your RevenueCat configuration

2. **Enable StoreKit Testing**:
   - In Xcode, go to **Product** → **Scheme** → **Edit Scheme**
   - Select **Run** → **Options**
   - Set **StoreKit Configuration** to `Configuration.storekit`

#### Android Development:
1. **Test Accounts**: Add test accounts in Google Play Console
2. **Test Purchases**: Use test accounts to make purchases

### 5. Environment Configuration

The app automatically detects the environment:

- **Development (`__DEV__ = true`)**:
  - Uses mock data if `MOCK_OFFERINGS` is enabled
  - Provides detailed debug logging
  - Graceful error handling

- **Production (`__DEV__ = false`)**:
  - Uses real RevenueCat API
  - Minimal logging
  - Strict error handling

## Troubleshooting

### Common Issues:

1. **"No offerings available" Error**:
   - Check if products are configured in RevenueCat dashboard
   - Verify offering is set as "Current"
   - Ensure API keys are correct

2. **StoreKit Configuration Issues**:
   - Make sure `Configuration.storekit` is properly configured
   - Verify product IDs match between StoreKit and RevenueCat
   - Check that StoreKit testing is enabled in Xcode

3. **Android Purchase Issues**:
   - Verify test accounts are added to Google Play Console
   - Check that products are activated
   - Ensure app is signed with correct keystore

### Development Tips:

1. **Use Mock Data**: Enable `MOCK_OFFERINGS` in `config/revenueCat.ts` for development
2. **Debug Logging**: Check console for detailed RevenueCat logs
3. **Test on Device**: Always test purchases on a physical device
4. **Sandbox Testing**: Use sandbox accounts for testing

## Testing Checklist

- [ ] RevenueCat initializes without errors
- [ ] Offerings are loaded successfully
- [ ] Purchase flow works end-to-end
- [ ] Restore purchases works
- [ ] User identification works
- [ ] Paywall displays correctly

## Production Deployment

1. **Update API Keys**: Ensure production API keys are used
2. **Disable Mock Data**: Set `MOCK_OFFERINGS` to `false`
3. **Test with Real Accounts**: Use real App Store/Google Play accounts
4. **Monitor Analytics**: Check RevenueCat dashboard for purchase events

## Support

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat Community](https://community.revenuecat.com/)
- [StoreKit Testing Guide](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_xcode) 