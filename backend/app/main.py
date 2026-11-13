from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database.database import engine, Base
from .api import routes_stream, routes_graph, routes_repair, routes_metrics, routes_experiments

# Initialize SQLite tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Dynamic Causal-Consistency Framework API",
    description="Executable Prototype for Counterfactual Repair of Streaming Data in Self-Healing ML Pipelines",
    version="1.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(routes_stream.router)
app.include_router(routes_graph.router)
app.include_router(routes_repair.router)
app.include_router(routes_metrics.router)
app.include_router(routes_experiments.router)

@app.on_event("startup")
def startup_event():
    # Warm up default pipeline
    manager = routes_stream.get_manager()
    if not manager.is_initialized:
        manager.initialize()
    # Process initial windows (e.g. W1 to establish stream)
    if len(manager.history) == 0:
        manager.process_step()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "framework": "Dynamic Causal-Consistency Framework for Counterfactual Repair",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
