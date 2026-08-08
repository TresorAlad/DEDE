from redis import Redis
from rq import Queue

from app.config import get_settings


settings = get_settings()
redis_conn = Redis.from_url(settings.redis_url)
audit_queue = Queue("audits", connection=redis_conn)


def enqueue_audit(audit_id: int) -> str:
    """Enqueue an audit job. Returns the RQ job id."""
    from app.worker import run_audit

    job = audit_queue.enqueue(run_audit, audit_id, job_timeout=1800)
    return job.id
