from sqlalchemy import Column, Integer, Float, String, Text, DateTime, Boolean, JSON
from datetime import datetime
from .database import Base

class WindowRecord(Base):
    __tablename__ = "window_records"

    id = Column(Integer, primary_key=True, index=True)
    window_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    window_size = Column(Integer)
    is_corrupted = Column(Boolean, default=False)
    corruption_type = Column(String, nullable=True)
    affected_variable = Column(String, nullable=True)
    corruption_severity = Column(Float, nullable=True)
    
    # Graph metrics
    shd = Column(Integer, default=0)
    edge_diff = Column(Float, default=0.0)
    causal_deviation = Column(Float, default=0.0)
    threshold = Column(Float, default=0.0)
    is_anomaly = Column(Boolean, default=False)
    is_sustained = Column(Boolean, default=False)
    
    # Localization & Repair
    localized_variable = Column(String, nullable=True)
    localization_score = Column(Float, nullable=True)
    acceptance_score = Column(Float, nullable=True)
    decision = Column(String, default="ACCEPT")  # ACCEPT, REJECT, ESCALATE
    
    # Downstream ML
    healthy_acc = Column(Float, nullable=True)
    corrupted_acc = Column(Float, nullable=True)
    repaired_acc = Column(Float, nullable=True)
    healthy_f1 = Column(Float, nullable=True)
    corrupted_f1 = Column(Float, nullable=True)
    repaired_f1 = Column(Float, nullable=True)
    
    # Counterfactual Metrics
    rmse = Column(Float, nullable=True)
    mae = Column(Float, nullable=True)
    causal_restoration_pct = Column(Float, nullable=True)
    
    # Detailed payloads
    provenance = Column(JSON, nullable=True)

class GraphSnapshot(Base):
    __tablename__ = "graph_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    window_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    graph_type = Column(String)  # HEALTHY, CORRUPTED, REPAIRED
    nodes = Column(JSON)
    edges = Column(JSON)

class ExperimentRecord(Base):
    __tablename__ = "experiment_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    name = Column(String)
    corruption_type = Column(String)
    severity = Column(Float)
    results = Column(JSON)
