async function hasPermission(userId, action, resource) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      },
      userPermissions: {
        include: {
          permission: true
        }
      }
    }
  });

  if (!user) {
    return false;
  }

  // First check for explicit user permission denials
  const explicitDenial = user.userPermissions.find(
    up => !up.granted && 
    up.permission.action === action && 
    up.permission.resource === resource
  );
  
  if (explicitDenial) {
    return false;
  }

  // Then check for explicit user permission grants
  const explicitGrant = user.userPermissions.find(
    up => up.granted && 
    up.permission.action === action && 
    up.permission.resource === resource
  );
  
  if (explicitGrant) {
    return true;
  }

  // Finally check role-based permissions
  return user.role.rolePermissions.some(
    rp => rp.permission.action === action && 
    rp.permission.resource === resource
  );
}