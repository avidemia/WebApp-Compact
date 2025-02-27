import UserAuthModel from '../../models/UserAuth_M.js';
import Response from '../Response.js';
import BookModel from '../project/modules/Book.js';
import checkSubscription from '../subscription/subscription.js';

const RES_401 = new Response(403, 'F').custom('Access denied for User.');

export async function checkIfAdmin(req, res, next) {
  // const { authData } = req;
  const { data } = await UserAuthModel.profileDetails(req);
  if (
    data?.user_role?.includes('SUPER_ADMIN') ||
    data?.user_role?.includes('REGULAR_ADMIN')
  ) {
    next();
  } else {
    res.status(401).json(RES_401);
  }
}

export async function checkIfAuthor(req, res, next) {
  const { data } = await UserAuthModel.profileDetails(req);
  if (
    data?.user_role?.includes('SUPER_ADMIN') ||
    data?.user_role?.includes('REGULAR_ADMIN') ||
    data?.user_role?.includes('AUTHOR')
  ) {
    next();
  } else {
    res.status(401).json(RES_401);
  }
}

export async function checkIfHasAccessToAi(req, res, next) {
  const { data } = await UserAuthModel.profileDetails(req);
  const subInfo = await checkSubscription(req.authData._id);

  if (
    data?.user_role?.includes('SUPER_ADMIN') ||
    data?.user_role?.includes('REGULAR_ADMIN') ||
    data?.user_role?.includes('AUTHOR') ||
    data?.user_role?.includes('INSTRUCTOR')
  ) {
    next();
  } else if (subInfo.allowAi) {
    next();
  } else {
    res.status(401).json(RES_401);
  }
}

export async function checkIfHasAccessToAiExam(req, res, next) {
  const { data } = await UserAuthModel.profileDetails(req);
  const subInfo = await checkSubscription(req.authData._id);

  if (
    data?.user_role?.includes('SUPER_ADMIN') ||
    data?.user_role?.includes('REGULAR_ADMIN') ||
    data?.user_role?.includes('AUTHOR') ||
    data?.user_role?.includes('INSTRUCTOR')
  ) {
    next();
  } else if (subInfo.allowAi) {
    next();
  } else {
    res.status(401).json(RES_401);
  }
}

export async function checkIfAuthorOrInstructor(req, res, next) {
  // const { authData } = req;
  const { data } = await UserAuthModel.profileDetails(req);
  if (
    data?.user_role?.includes('SUPER_ADMIN') ||
    data?.user_role?.includes('REGULAR_ADMIN') ||
    data?.user_role?.includes('AUTHOR') ||
    data?.user_role?.includes('INSTRUCTOR')
  ) {
    next();
  } else {
    res.status(401).json(RES_401);
  }
}
export async function checkIfInstructor(req, res, next) {
  // const { authData } = req;
  const { data } = await UserAuthModel.profileDetails(req);

  if (
    data?.user_role?.includes('SUPER_ADMIN') ||
    data?.user_role?.includes('REGULAR_ADMIN') ||
    data?.user_role?.includes('INSTRUCTOR')
  ) {
    next();
  } else {
    res.status(401).json(RES_401);
  }
}

export async function checkIfReader(req, res, next) {
  // const { authData } = req;
  const { data } = await UserAuthModel.profileDetails(req);

  if (
    data?.user_role?.includes('SUPER_ADMIN') ||
    data?.user_role?.includes('REGULAR_ADMIN') ||
    data?.user_role?.includes('READER')
  ) {
    next();
  } else {
    res.status(401).json(RES_401);
  }
}

export async function checkIfStudent(req, res, next) {
  // const { authData } = req;
  const { data } = await UserAuthModel.profileDetails(req);

  if (
    data?.user_role?.includes('SUPER_ADMIN') ||
    data?.user_role?.includes('REGULAR_ADMIN') ||
    data?.user_role?.includes('STUDENT')
  ) {
    next();
  } else {
    res.status(401).json(RES_401);
  }
}

export async function checkRolesPermissions(req, res, next) {
  const { data } = await UserAuthModel.profileDetails(req);
  const userRoles = data.user_role;
  req.rolesData = [];
  const bookId = req.queryData.book_id;

  if (
    userRoles.includes('SUPER_ADMIN') ||
    data.user_role.includes('REGULAR_ADMIN')
  ) {
    next();
  } else if (userRoles.includes('AUTHOR') && userRoles.includes('INSTRUCTOR')) {
    if (req.queryData.bookType === 'main') {
      const customReq = { book_id: bookId, authData: { ...req.authData } };
      const mainBookAuthority = await BookModel.findBookAuthority(customReq);

      if (req.queryData.queryOn === 'book') {
        if (mainBookAuthority[0]) {
          req.rolesData.push(
            {
              type: 'AUTHOR',
              read: true,
              write: true,
              edit: true,
            },
            {
              type: 'INSTRUCTOR',
              read: true,
              write: false,
              edit: false,
            },
          );
        } else {
          req.rolesData.push(
            {
              type: 'AUTHOR',
              read: true,
              write: false,
              edit: false,
            },
            {
              type: 'INSTRUCTOR',
              read: true,
              write: false,
              edit: false,
            },
          );
        }
      }
    }

    // need to work
    if (req.queryData.bookType === 'clone') {
      const customReq = { book_id: bookId, authData: { ...req.authData } };
      const cloneBookAuthority = await BookModel.findClonedBookAuthority(
        customReq,
      );
      if (cloneBookAuthority[0]) {
        req.rolesData.push(
          {
            type: 'AUTHOR',
            read: true,
            write: false,
            edit: false,
          },
          {
            type: 'INSTRUCTOR',
            read: true,
            write: true,
            edit: true,
          },
        );
      } else {
        req.rolesData.push(
          {
            type: 'AUTHOR',
            read: true,
            write: false,
            edit: false,
          },
          {
            type: 'INSTRUCTOR',
            read: true,
            write: false,
            edit: false,
          },
        );
      }
    }
    next();
  } else if (userRoles.includes('AUTHOR')) {
    if (req.queryData.bookType === 'main') {
      const customReq = { book_id: bookId, authData: { ...req.authData } };
      const mainBookAuthority = await BookModel.findBookAuthority(customReq);

      if (req.queryData.queryOn === 'book') {
        if (mainBookAuthority[0]) {
          req.rolesData.push({
            type: 'AUTHOR',
            read: true,
            write: true,
            edit: true,
          });
          next();
        } else {
          req.rolesData.push({
            type: 'AUTHOR',
            read: true,
            write: false,
            edit: false,
          });
          next();
        }
      }
    }

    if (req.queryData.bookType === 'clone') {
      // need to work
      next();
    }
  } else if (userRoles.includes('INSTRUCTOR')) {
    if (req.queryData.bookType === 'main') {
      req.rolesData.push({
        type: 'INSTRUCTOR',
        read: true,
        write: false,
        edit: false,
      });
      next();
    } else {
      const customReq = {
        clone_book_id: bookId,
        authData: { ...req.authData },
      };
      const cloneBookAuthority = await BookModel.findClonedBookAuthority(
        customReq,
      );

      req.rolesData.push({
        type: 'INSTRUCTOR',
        read: true,
        write: true,
        edit: true,
      });
      next();
    }
  } else if (userRoles.includes('STUDENT')) {
    req.rolesData.push({
      type: 'STUDENT',
      read: true,
      write: false,
      edit: false,
    });
    next();
  } else if (userRoles.includes('READER')) {
    req.rolesData.push({
      type: 'READER',
      read: true,
      write: false,
      edit: false,
    });
    next();
  } else {
    res.status(401).json(RES_401);
  }

  // res.status(200).json({ rolesData: userRoles, queryData: req.queryData });
}
