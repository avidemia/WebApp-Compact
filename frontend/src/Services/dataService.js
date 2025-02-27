import axios from 'axios';
import { Storage } from 'src/Storage';
// import store from '../Redux/store'

const REACT_APP_API_BASEURL = process.env.REACT_APP_API_BASEURL;

const refreshToken = Storage.get('authToken');
const refreshOtpToken = Storage.get('otpToken');

const client = axios.create({
  baseURL: REACT_APP_API_BASEURL,
  withCredentials: false,
});
const header = (optionalHeader) => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Access-Control-Allow-Origin': '*',
    crossDomain: true,
    ...optionalHeader,
  };

  let authenticate = '';
  if (refreshOtpToken) {
    authenticate = refreshOtpToken && JSON.parse(refreshOtpToken).token;
    headers.Authorization = authenticate;
  }
  if (refreshToken) {
    authenticate = refreshToken && JSON.parse(refreshToken).token;
    headers.Authorization = authenticate;
  }
  return headers;
};

class DataService {
  static isLogin() {
    const token = refreshToken && JSON.parse(refreshToken).token;
    if (token) return true;
    return false;
  }
  // GET --
  static get(path = '', params = false, optionalHeader) {
    if (params) {
      params = Object.keys(params)
        .map((key) => key + '=' + params[key])
        .join('&');
    }
    return client({
      method: 'GET',
      url: params ? path + '?' + params : path,
      headers: header(optionalHeader),
    });
  }

  // POST--'''
  static post(path = '', data = {}, optionalHeader) {
    return client({
      method: 'Post',
      url: path,
      data,
      headers: header(optionalHeader),
    });
  }

  //patch
  static patch(path = '', data = {}, optionalHeader) {
    return client({
      method: 'PATCH',
      url: path,
      data,
      headers: header(optionalHeader),
    });
  }

  //put
  static put(path = '', data = {}, optionalHeader) {
    return client({
      method: 'PUT',
      url: path,
      data,
      headers: header(optionalHeader),
    });
  }

  //Delete
  static delete(path = '', data = {}, optionalHeader) {
    return client({
      method: 'Delete',
      url: path,
      data,
      headers: header(optionalHeader),
    });
  }
}

client.interceptors.request.use((config) => {
  const requestConfig = config;
  const { headers } = config;
  requestConfig.headers = { ...headers };

  return requestConfig;
});

client.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response, config } = error;
    if (response) {
      if (config.url === '/user/login' && response.data.code === 401) {
        // Storage.remove('authToken');
        // Storage.remove('otpToken');
      } else if (response.data.code === 401) {
        Storage.remove('authToken');
        Storage.remove('otpToken');
        window.location.href = '/';
      } else if (config.url !== '/') {
        if (response.data.code === 401) {
          // Storage.remove('authToken');
          // Storage.remove('otpToken');
        }
      }
      return response.data;
    } else {
      if (response && response.data) {
        return response.data;
      } else {
        return false;
      }
    }
    // return Promise.reject(error);
  }
);
export { DataService };
