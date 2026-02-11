import axios from 'axios'
import FormData from 'form-data'

export const sendSms = async (to, message) => {
  try {
    let data = new FormData();
    data.append('token', process.env.SMS_TOKEN);
    data.append('senderID', 'ABC Ltd');
    data.append('recipients', to);
    data.append('message', message);

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://my.kudisms.net/api/corporate',
      headers: {
        ...data.getHeaders()
      },
      data: data
    };

    axios.request(config)
      .then((response) => {
        console.log(JSON.stringify(response.data));
      })
      .catch((error) => {
        console.log(error);
      })

  } catch (error) {
    console.error("SMS Sending Error:", error)
  }
}