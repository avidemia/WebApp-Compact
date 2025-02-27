import JWT from 'jsonwebtoken';
import User from '../../schema/User/User.js';
import Response from '../Response.js';

/* -------------------------------------------------------------------------- */
/*                                 Auth Token                                 */
/* -------------------------------------------------------------------------- */

const checkAuthToken = async (headers, property, model) => {
  let response;
  try {
    if (!headers.authorization) {
      response = new Response(401, false).authResponse('AUTH_TOKEN');
    } else {
      const findObj = {};

      findObj[property] = headers.authorization;
      const findAdmin = await model.findOne(findObj);
      if (!findAdmin) {
        response = new Response(401).authResponse('INVALID_AUTH_TOKEN');
      } else {
        response = new Response(200, findAdmin).authResponse('AUTH_SUCCESS');
      }
    }
    return response;
  } catch (error) {
    return new Response().coreResponse();
  }
};

/* -------------------------------------------------------------------------- */
/*                               JWT Validation                               */
/* -------------------------------------------------------------------------- */

async function signJwt(payloadData) {
  const jwtPayload = payloadData;

  const addToken = { ...payloadData };

  // JWT token with Payload and secret.
  addToken.token = JWT.sign(jwtPayload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TIMEOUT_DURATION,
  });

  addToken.refresh_token = JWT.sign(
    jwtPayload,
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_TIMEOUT_DURATION,
    },
  );

  return addToken;
}

async function verifyJwt(req, res, next) {
  // get token from headers
  const { authorization } = req.headers;

  try {
    if (!authorization) {
      // no authorization
      res
        .status(401)
        .json(
          new Response(401).custom(
            'Access denied Authorization in header needed.',
          ),
        );
    } else if (authorization) {
      const verifyValidToken = JWT.decode(authorization);

      if (!verifyValidToken) {
        res
          .status(401)
          .json(new Response(401).custom('Invalid token in headers provided.'));
      } else {
        const decoded = await JWT.verify(
          authorization,
          process.env.ACCESS_TOKEN_SECRET,
          {
            ignoreExpiration: true,
          },
        );

        const findUserWithAuth = await User.findOne({
          email: decoded.email,
        }).lean();

        const todayDate = new Date().getTime();

        if (decoded.exp < todayDate / 1000) {
          res.status(401).json(new Response(401).custom('JWT Token Expired'));
        } else if (decoded.is_active === 'INACTIVE') {
          res
            .status(401)
            .json(
              new Response(400).custom(
                'Your account is not active. Please contact to administrator',
              ),
            );
        } else if (findUserWithAuth) {
          req.authData = decoded;
          next();
        } else {
          res
            .status(401)
            .json(
              new Response(401).custom('Invalid Authorization in headers.'),
            );
        }
      }
    }
  } catch (error) {
    if (error.message === 'invalid signature') {
      res
        .status(401)
        .json(new Response(401).custom('Login Again (Invalid JWT Signature).'));
    } else {
      res.status(500).json(new Response(500).custom(error.message));
    }
  }
}

async function refreshJwt(payloadData) {
  const jwtPayload = payloadData;

  const addToken = { ...payloadData };

  // JWT token with Payload and secret.
  addToken.token = JWT.sign(jwtPayload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_TIMEOUT_DURATION,
  });

  return addToken;
}

async function verifyRefreshToken(req, res) {
  try {
    const { token } = req.headers;

    const verifyToken = await JWT.verify(
      token,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const clientData = await User.findOne({
      auth_token: verifyToken.auth_token,
    });

    const payLoad = {
      id: clientData._id,
      plan_id: clientData.plan_id,
      user_type: clientData.user_type,
      is_active: clientData.is_active,
      first_name: clientData.first_name,
      last_name: clientData.last_name,
      email: clientData.email,
      phone: clientData.phone,
      image: clientData.image,
      auth_token: clientData.auth_token,
      ...(clientData.can_create && { can_create: clientData.can_create }),
      ...(clientData.state_operation && {
        state_operation: clientData.state_operation,
      }),
      ...(clientData.branch_operation && {
        branch_operation: clientData.branch_operation,
      }),
      ...(clientData.user_operation && {
        user_operation: clientData.user_operation,
      }),
    };

    const jwtToken = await signJwt(payLoad);
    const refreshToken = await refreshJwt(payLoad);
    jwtToken.refresh_token = refreshToken.token;

    res.status(200).json(jwtToken);
  } catch (error) {
    if (error.message === 'invalid signature') {
      res
        .status(403)
        .json(
          new Response(403).coreResponse('Login Again (Invalid JWT Signature)'),
        );
    } else if (error.message === 'invalid token') {
      res
        .status(403)
        .json(new Response(403).coreResponse('Invalid JWT passed.'));
    } else {
      res.status(500).json(new Response(500).coreResponse(error.message));
    }
  }
}

export { checkAuthToken, signJwt, verifyJwt, refreshJwt, verifyRefreshToken };
