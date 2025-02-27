// eslint-disable-next-line import/prefer-default-export
export function extractRequestData(reqObject) {
  const {
    body,
    params,
    query,
    authData,
    file,
    files,
    cookies,
    session,
    ip,
    queryData,
    rolesData,
  } = reqObject;

  const requestData = {
    ip,
    ...(body && { ...body }),
    ...(authData && { authData }),
    ...(queryData && { queryData }), // Project Specific
    ...(rolesData && { rolesData }), // Project Specific
    ...(file && { file }),
    ...(files && { files }),
    ...(query && { ...query }),
    ...(cookies.myCookie && { ...cookies.myCookie }),
    ...(session.mySession && { ...session.mySession }),
    ...(params.id && { id: params.id }),
    ...(params.slug && { slug: params.slug }),
    ...(params.type && { type: params.type }),
    ...(params.user_id && { user_id: params.user_id }),
    ...(params.header && { header: params.header }),
    ...(params.subject && { subject: params.subject }),
  };

  return requestData;
}
