from datetime import datetime, timedelta

from schemas import DeadlineStatus, TaskStatus

def get_deadline_status(task):
    if task.due_date is None:
        return DeadlineStatus.NO_DUE_DATE

    if task.status in [
        TaskStatus.DONE,
        TaskStatus.CANCELLED
    ]:
        return DeadlineStatus.NORMAL

    now = datetime.now()

    if task.due_date < now:
        return DeadlineStatus.OVERDUE

    if task.due_date <= now + timedelta(days=3):
        return DeadlineStatus.UPCOMING

    return DeadlineStatus.NORMAL