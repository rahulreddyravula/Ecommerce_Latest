import twilio from 'twilio';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

/**
 * Sends an OTP verification SMS to the user's mobile number.
 * Renders the custom message template and routes the request
 * based on the configured SMS_PROVIDER environment variable.
 * 
 * @param {string} phone - User's mobile phone number (E.164 format)
 * @param {string} otp - The generated numeric OTP code
 */
export const sendSmsOtp = async (phone, otp) => {
  const messageBody = `Your login verification code is ${otp}. This code is valid for 5 minutes. Do not share this code with anyone.`;
  
  const provider = (process.env.SMS_PROVIDER || 'simulated').toLowerCase().trim();

  if (provider === 'twilio') {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    const isTwilioConfigured = 
      twilioSid && twilioSid.trim() !== '' &&
      twilioAuthToken && twilioAuthToken.trim() !== '' &&
      twilioPhone && twilioPhone.trim() !== '';

    if (!isTwilioConfigured) {
      throw new Error('Twilio is selected as the SMS provider, but credentials are not configured in environment variables.');
    }

    try {
      const twilioClient = twilio(twilioSid, twilioAuthToken);
      const message = await twilioClient.messages.create({
        body: messageBody,
        from: twilioPhone,
        to: phone
      });
      console.log(`[SMS Gateway Twilio] Real SMS successfully sent to ${phone.slice(0, 6)}****. Msg SID: ${message.sid}`);
      return { success: true, provider: 'twilio' };
    } catch (error) {
      console.error(`[SMS Gateway Twilio Error] Failed to send message to ${phone.slice(0, 6)}****:`, error.message);
      throw new Error(`SMS delivery failed via Twilio gateway: ${error.message}`);
    }
  } else if (provider === 'msg91') {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID;

    const isMsg91Configured = 
      authKey && authKey.trim() !== '' &&
      templateId && templateId.trim() !== '';

    if (!isMsg91Configured) {
      throw new Error('MSG91 is selected as the SMS provider, but credentials are not configured in environment variables.');
    }

    try {
      const response = await fetch('https://api.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': authKey
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile: phone,
          otp: otp,
          sender: senderId || undefined
        })
      });
      
      const data = await response.json();
      if (response.ok && (data.type === 'success' || data.success)) {
        console.log(`[SMS Gateway MSG91] Real SMS successfully sent to ${phone.slice(0, 6)}****.`);
        return { success: true, provider: 'msg91' };
      } else {
        throw new Error(data.message || 'MSG91 API error response');
      }
    } catch (error) {
      console.error(`[SMS Gateway MSG91 Error] Failed to send message to ${phone.slice(0, 6)}****:`, error.message);
      throw new Error(`SMS delivery failed via MSG91 gateway: ${error.message}`);
    }
  } else if (provider === 'aws_sns') {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    const isAwsConfigured = 
      accessKeyId && accessKeyId.trim() !== '' &&
      secretAccessKey && secretAccessKey.trim() !== '';

    if (!isAwsConfigured) {
      throw new Error('AWS SNS is selected as the SMS provider, but credentials are not configured in environment variables.');
    }

    try {
      const snsClient = new SNSClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });

      const params = {
        Message: messageBody,
        PhoneNumber: phone,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };

      if (process.env.AWS_SNS_SENDER_ID) {
        params.MessageAttributes['AWS.SNS.SMS.SenderID'] = {
          DataType: 'String',
          StringValue: process.env.AWS_SNS_SENDER_ID
        };
      }

      const command = new PublishCommand(params);
      const response = await snsClient.send(command);
      console.log(`[SMS Gateway AWS SNS] Real SMS successfully sent to ${phone.slice(0, 6)}****. MessageId: ${response.MessageId}`);
      return { success: true, provider: 'aws_sns' };
    } catch (error) {
      console.error(`[SMS Gateway AWS SNS Error] Failed to send message to ${phone.slice(0, 6)}****:`, error.message);
      throw new Error(`SMS delivery failed via AWS SNS gateway: ${error.message}`);
    }
  } else {
    // Simulated sandbox mode
    console.log('\n=======================================');
    console.log(`[SMS Gateway Simulated] TO: ${phone}`);
    console.log(`[SMS Gateway Simulated] MESSAGE:\n${messageBody}`);
    console.log('=======================================\n');
    return { success: true, provider: 'simulated', otp };
  }
};

