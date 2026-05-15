from sqlalchemy.orm import Session
from app.db.models.search_history import SearchHistory

class SearchHistoryRepository:
    def create(
        self,
        db: Session,
        user_id: str,
        query: str,
    ) -> SearchHistory:
        search = SearchHistory(
            user_id=user_id,
            query=query,
        )
        db.add(search)
        db.commit()
        db.refresh(search)
        return search