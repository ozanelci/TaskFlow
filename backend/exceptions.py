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


class RoomNotFound(Exception):
    pass


class RoomAlreadyJoined(Exception):
    pass

class RoomMembershipNotFound(Exception):
    pass