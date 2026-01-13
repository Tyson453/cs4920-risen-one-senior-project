import { SocialUser } from '@abacritt/angularx-social-login'
import { Session, SessionToken } from './session'

export interface UserToken {
  id: string,
  uuid: string,
  name: string,
  firstName: string,
  lastName: string,
  email: string,
  photoUrl: string,
  sessions: SessionToken[],
  supervisorId?: string,
  startDate?: string,
  roles: string[],
  assignments?: string[],
}

/**
 * Custom type guard to determine if an object is a {@link UserToken}
 *
 * @param user an object that may or may not be a {@link UserToken}
 * @returns
 */
export function isUserToken(user: UserToken | SocialUser): user is UserToken {
  return 'sessions' in user
}

/**
 * @class
 * Represents a user of the platform (i.e. a ROC employee)
 */
export class User implements UserToken {
  /**
   * Unique identifier for the user, equal to the identifier provided by Google via
   * Google Workspace
   */
  id: string

  /**
   * Unique identifier for the user, used as the primary key in the database
   */
  uuid: string

  /**
   * The user's full name
   */
  name: string

  /**
   * The user's first name
   */
  firstName: string

  /**
   * The user's last name
   */
  lastName: string

  /**
   * The user's email address
   */
  email: string

  /**
   * The address of the user's profile picture
   */
  photoUrl: string

  /**
   * The list of {@link SessionToken} objects that describe the user's interactions
   * with the portal
   */
  sessions: Session[]

  /**
   * The ID of the user's direct supervisor
   */
  supervisorId?: string

  /**
   * The date the user started working for ROC
   */
  startDate?: string

  /**
   * The roles that the user has been assigned
   */
  roles: string[]

  /**
   * The list of assigned projects of the user
   */
  assignments?: string[] = []

  /**
   * Construct a new {@link User} object.
   *
   * @param user a user object provided by either the Google API or the backend
   */
  constructor(user: UserToken | SocialUser) {
    this.id = user.id
    this.name = user.name
    this.email = user.email
    this.photoUrl = user.photoUrl
    this.firstName = user.firstName
    this.lastName = user.lastName
    if (isUserToken(user)) {
      this.uuid = user.uuid
      this.sessions = user.sessions.map(session => new Session(session))
      this.name = user.name || `${user.firstName}.${user.lastName}`
      this.supervisorId = user.supervisorId
      this.startDate = user.startDate
      this.roles = user.roles
      this.assignments = user.assignments
    } else {
      this.uuid = user.id
      this.sessions = []
      this.name = `${user.firstName}.${user.lastName}`
      this.roles = []
      this.assignments = []
    }
  }

  /**
   * Return the first session in the sessions array that is not expired, or create a
   * new session if none are found.
   * @returns {Session} The current session or a new session
   */
  getCurrentSession(): Session {
    return this.sessions.find(session => !session.isExpired) || new Session()
  }

  /**
   * Look for a role in the user's roles array, ignoring case.
   *
   * @param role the value to look for in the roles array
   * @returns true if the role is found, false otherwise
   */
  hasRole(role: string): boolean {
    return this.roles.map(role => role.toUpperCase()).includes(role.toUpperCase())
  }
}
