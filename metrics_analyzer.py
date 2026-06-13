from datetime import datetime


def calculate_bus_factor_risk(contributors):
    """Calculate Bus Factor Risk"""
    if not contributors:
        return "Unknown", 0, 50

    total_commits = sum(
        c.get("contributions", 0)
        for c in contributors
    )

    if total_commits == 0:
        return "Unknown", 0, 50

    top_commits = max(
        c.get("contributions", 0)
        for c in contributors
    )

    top_share = round(
        (top_commits / total_commits) * 100,
        1
    )

    if top_share > 70:
        return "High 🔴", top_share, 85
    elif top_share > 40:
        return "Medium 🟡", top_share, 55
    return "Low 🟢", top_share, 25


def calculate_issue_closing_time(closed_issues):
    """Average issue closing time"""
    if not closed_issues:
        return 0, "⚪", "No data"

    closing_times = []

    for issue in closed_issues:
        try:
            created = issue.get("created_at")
            closed = issue.get("closed_at")

            if created and closed:
                created = datetime.strptime(created, "%Y-%m-%dT%H:%M:%SZ")
                closed = datetime.strptime(closed, "%Y-%m-%dT%H:%M:%SZ")

                days = (closed - created).days
                if days >= 0:
                    closing_times.append(days)
        except Exception:
            pass

    if not closing_times:
        return 0, "⚪", "No data"

    avg_days = round(sum(closing_times) / len(closing_times), 1)

    if avg_days < 7:
        return avg_days, "🟢", "Excellent"
    elif avg_days < 30:
        return avg_days, "🟢", "Good"
    elif avg_days < 90:
        return avg_days, "🟡", "Fair"
    return avg_days, "🔴", "Slow"


def calculate_maintainer_responsiveness(issues, comments):
    """Calculate maintainer responsiveness"""
    if not issues or not comments:
        return 50, "Unknown"

    now = datetime.utcnow()
    recent_comments = 0

    for comment in comments:
        try:
            created = comment.get("created_at")
            if created:
                date = datetime.strptime(created, "%Y-%m-%dT%H:%M:%SZ")
                if (now - date).days < 30:
                    recent_comments += 1
        except Exception:
            pass

    ratio = recent_comments / max(len(issues), 1)
    score = min(100, int(ratio * 50))
    score = max(score, 35)

    if score >= 80:
        rating = "Very Active 🟢"
    elif score >= 50:
        rating = "Active 🟡"
    else:
        rating = "Slow 🔴"

    return score, rating


def count_stale_issues(issues, days_threshold=45):
    """Count stale issues"""
    if not issues:
        return 0, 0, "No data"

    now = datetime.utcnow()
    stale_count = 0

    for issue in issues:
        try:
            updated = issue.get("updated_at")
            if updated:
                date = datetime.strptime(updated, "%Y-%m-%dT%H:%M:%SZ")
                if (now - date).days > days_threshold:
                    stale_count += 1
        except Exception:
            pass

    stale_percentage = round((stale_count / len(issues)) * 100, 1)

    if stale_percentage < 10:
        status = "Healthy 🟢"
    elif stale_percentage < 30:
        status = "Fair 🟡"
    else:
        status = "Needs Attention 🔴"

    return stale_count, stale_percentage, status


def calculate_activity_recency(comments):
    """Recent maintainer activity"""
    if not comments:
        return 20

    latest_date = None

    for comment in comments:
        try:
            created = comment.get("created_at")
            if created:
                date = datetime.strptime(created, "%Y-%m-%dT%H:%M:%SZ")
                if not latest_date or date > latest_date:
                    latest_date = date
        except Exception:
            pass

    if not latest_date:
        return 20

    days = (datetime.utcnow() - latest_date).days

    if days < 7:
        return 100
    elif days < 30:
        return 80
    elif days < 90:
        return 50
    return 20


def calculate_overall_health_score(
    issue_closing_time,
    responsiveness,
    stale_percentage,
    activity_score,
    bus_factor_risk_score
):
    """Overall repository health"""
    closing_score = max(0, 100 - issue_closing_time)
    stale_score = max(0, 100 - stale_percentage)
    bus_score = 100 - bus_factor_risk_score

    health_score = round(
        closing_score * 0.25 +
        responsiveness * 0.25 +
        stale_score * 0.20 +
        activity_score * 0.20 +
        bus_score * 0.10,
        1
    )

    if health_score >= 80:
        return health_score, "🟢", "Healthy"
    elif health_score >= 60:
        return health_score, "🟡", "Fair"
    return health_score, "🔴", "Needs Work"


def generate_metrics_summary(
    contributors,
    closed_issues,
    open_issues,
    comments,
    heatmap_data=None
):
    """Generate metrics summary"""
    bus_level, top_share, bus_score = calculate_bus_factor_risk(contributors)

    avg_days, closing_emoji, closing_rating = calculate_issue_closing_time(closed_issues)

    responsiveness, responsiveness_rating = calculate_maintainer_responsiveness(
        open_issues, comments
    )

    stale_count, stale_percentage, stale_status = count_stale_issues(open_issues)

    activity_score = calculate_activity_recency(comments)

    health_score, health_emoji, health_status = calculate_overall_health_score(
        avg_days,
        responsiveness,
        stale_percentage,
        activity_score,
        bus_score
    )

    return {
        "bus_factor": {
            "risk_level": bus_level,
            "top_contributor_share": top_share,
            "risk_score": bus_score
        },
        "issue_closing": {
            "avg_days": avg_days,
            "emoji": closing_emoji,
            "rating": closing_rating
        },
        "maintainer_responsiveness": {
            "score": responsiveness,
            "rating": responsiveness_rating
        },
        "stale_issues": {
            "count": stale_count,
            "percentage": stale_percentage,
            "status": stale_status
        },
        "overall_health": {
            "score": health_score,
            "emoji": health_emoji,
            "status": health_status
        }
    }
