import axios from 'axios';
import React from 'react';
import { message } from 'antd';

// return the user data from the session storage
export const getUser = () => {
  
  const userStr = localStorage.getItem('user');
  if (userStr) return JSON.parse(userStr);
  else return null;
}

// return the token from the session storage
export const getToken = () => {
  return localStorage.getItem('token') || null;
}


// remove the token and user from the session storage
export const removeUserSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// set the token and user from the session storage
export const setUserSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

class Auth extends React.Component {
    constructor() {
      super();
      this.state = {
        showWarning: false,
        error: ''
      };
      if (getToken()) {
        this.authenticated = true;
      } else {
        this.authenticated = false;
      }
    }
  
    login(cb, values) {
      axios
      .post('https://main-server-si.herokuapp.com/api/auth/login', {
            username: values.username,
            password: values.password,
            role: "ROLE_MERCHANT"
      }).then((response) => {
            if (response.data.length === 0) {
                message.error("Something went wrong!");
                return;
            }
            let user = {
              id: response.data.profile.userId,
              username: response.data.profile.username,
              email: response.data.profile.email,
              name: response.data.profile.name,
              surname: response.data.profile.surname,
              dateofbirth: response.data.profile.dateOfBirth,
              jmbg: response.data.profile.jmbg,
              address: response.data.profile.address,
              phoneNumber: response.data.profile.phoneNumber,
              country: response.data.profile.country,
              city: response.data.profile.city,
          }
            setUserSession(response.data.token, user);
            this.authenticated = true;
            cb();
      }).catch(error => {
            if (error.response == null) {
                message.error("Please check your internet connection!");
                return;
            }
            if (error.response.status === 401)
                message.error("Wrong Username or Password!");
            else
                message.error(error.response.data.message);
      });
    }
  
    logout(cb) {
      removeUserSession();
      this.authenticated = false;
      cb();
    }
  
    isAuthenticated() {
      return this.authenticated;
    }
  }
  
  export default new Auth();