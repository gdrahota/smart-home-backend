import ClientRepository from '../database/repository/clients'
import LdapAuthService from '../services/ldap-auth-service'
import config from '../../config/server'

const AppRolesToLdapRoles = config.appRolesToLdapRoles

const registeredUsers = [
  {
    accountName: 'robert',
    mail: 'robert.enk@db-training.de',
    groups: ['EnterList', 'GenericListUser', 'EnterListAddList']
  }
]

export const mapLdapGroupsToAppRoles = (appRolesToLdapRoles, userGroups) => {
  const userRights = {}

  Object.keys(appRolesToLdapRoles).forEach(feature => {
    userRights[feature] = {}

    Object
      .keys(appRolesToLdapRoles[feature])
      .forEach(role => {
        userRights[feature][role] = appRolesToLdapRoles[feature][role].some(needed => userGroups.some(userGroup => needed === userGroup))
      })
  })

  return userRights
}

const login = (credentials, socketId, cb) => {
  const { username, password } = credentials
  const uuid = require('uuid/v4')
  let environment = 'production'

  try {
    environment = process.env.NODE_ENV
  } catch (e) {
  }

  if (environment !== 'production') {
    // local auth
    const user = registeredUsers.find(regUser => regUser.accountName === username)

    if (user) {
      const expires = new Date()
      expires.setHours(expires.getHours() + 4)

      ClientRepository.add(uuid(), user, socketId, expires)
        .then(
          client => cb(null, { client, roles: mapLdapGroupsToAppRoles(AppRolesToLdapRoles, user.groups) }),
          err => cb(err)
        )
        .catch()
    } else {
      cb('UNKNOWN_USER_OR_WRONG_PASSWORD')
    }
  } else {
    // LDAP auth
    LdapAuthService.authenticate(username, password)
      .then(
        user => {
          console.log('LDAP -> ALL DONE SUCCESSFULLY', user)

          const expires = new Date()
          expires.setHours(expires.getHours() + 4)

          ClientRepository.add(uuid(), user, socketId, expires)
            .then(
              client => cb(null, { client, roles: mapLdapGroupsToAppRoles(AppRolesToLdapRoles, client.user.groups) }),
              err => cb(err)
            )
        },
        err => {
          console.log('UNKNOWN_USER_OR_WRONG_PASSWORD', err)
          cb('UNKNOWN_USER_OR_WRONG_PASSWORD')
        }
      )
      .catch()
  }
}

const reLogin = (socket, clientId, cb) => {
  const expires = new Date()
  expires.setHours(expires.getHours() + 4)

  ClientRepository.relogin(socket.id, clientId, expires, (err, client) => {
    if (err || !client) {
      cb('error during logout')
    } else {
      cb(null, { client, roles: mapLdapGroupsToAppRoles(AppRolesToLdapRoles, client.user.groups) })
    }
  })
}

const logOut = (clientId, cb) =>
  ClientRepository.logOut(clientId, (err, client) => cb(err, client))

const logOutExpired = (actualDate, cb) => {
  ClientRepository.logOutExpired(actualDate, err => cb(err))
}

const updateExpirationDate = socketId => {
  const expires = new Date()
  expires.setHours(expires.getHours() + 4)
  ClientRepository.updateExpirationDate(socketId, expires)
}

export default {
  login,
  logOut,
  logOutExpired,
  reLogin,
  updateExpirationDate
}