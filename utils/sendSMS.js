import axios from 'axios'
import FormData from 'form-data'

export const sendSms = async (to, message) => {
  const data = new FormData();
  data.append('token', process.env.SMS_TOKEN);
  data.append('senderID', 'ABC Ltd');
  data.append('recipients', to);
  data.append('message', message);

  const response = await axios.post('https://my.kudisms.net/api/corporate', data, {
    maxBodyLength: Infinity,
    headers: data.getHeaders()
  });

  return response.data;
}