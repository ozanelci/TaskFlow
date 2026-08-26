class UserNotFound(Exception):
    pass


class UserAlreadyExists(Exception):
    pass


class ForbiddenError(Exception):
    pass


class UnauthorizedError(Exception):
    pass

class InvalidRequestError(Exception):
    pass

class TaskNotFound(Exception):
    pass