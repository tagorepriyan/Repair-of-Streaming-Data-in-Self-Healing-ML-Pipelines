import networkx as nx
import numpy as np
from typing import Dict, Any, Tuple

def compute_shd(G_true: nx.DiGraph, G_est: nx.DiGraph) -> int:
    """
    Structural Hamming Distance (SHD) between two directed graphs.
    Counts edge additions, deletions, and reversals.
    """
    edges_true = set(G_true.edges())
    edges_est = set(G_est.edges())

    # Undirected edges
    undir_true = {tuple(sorted(e)) for e in edges_true}
    undir_est = {tuple(sorted(e)) for e in edges_est}

    # Extra edges in est + missing edges from true
    extra_undir = undir_est - undir_true
    missing_undir = undir_true - undir_est

    # Common undirected edges with reversed direction
    common_undir = undir_true.intersection(undir_est)
    reversed_count = 0
    for u, v in common_undir:
        in_true = (u, v) in edges_true
        in_est = (u, v) in edges_est
        if in_true != in_est:
            reversed_count += 1

    shd = len(extra_undir) + len(missing_undir) + reversed_count
    return shd

def compute_edge_weight_diff(G_true: nx.DiGraph, G_est: nx.DiGraph) -> float:
    """
    Computes average absolute difference in edge weights across union of edges.
    """
    all_edges = set(G_true.edges()).union(set(G_est.edges()))
    if not all_edges:
        return 0.0

    diffs = []
    for u, v in all_edges:
        w_true = G_true[u][v].get("weight", 0.0) if G_true.has_edge(u, v) else 0.0
        w_est = G_est[u][v].get("weight", 0.0) if G_est.has_edge(u, v) else 0.0
        diffs.append(abs(w_true - w_est))

    return float(np.mean(diffs))

def compute_causal_deviation(G_healthy: nx.DiGraph, G_window: nx.DiGraph, alpha: float = 0.7) -> Tuple[float, int, float]:
    """
    Dynamic Causal Deviation:
    D_c(G_H, G_t) = alpha * SHD_normalized + (1 - alpha) * avg_edge_weight_diff
    Returns (D_c, shd, edge_diff)
    """
    shd = compute_shd(G_healthy, G_window)
    edge_diff = compute_edge_weight_diff(G_healthy, G_window)

    max_edges = max(len(G_healthy.edges()), len(G_window.edges()), 1)
    normalized_shd = min(1.0, shd / (max_edges * 1.5))

    causal_dev = alpha * normalized_shd + (1.0 - alpha) * min(1.0, edge_diff)
    return float(causal_dev), shd, float(edge_diff)

def graph_to_dict(G: nx.DiGraph) -> Dict[str, Any]:
    """
    Serializes NetworkX DiGraph for React Flow and API responses.
    """
    nodes = []
    for i, node in enumerate(G.nodes()):
        nodes.append({
            "id": node,
            "data": {"label": node},
            "in_degree": G.in_degree(node),
            "out_degree": G.out_degree(node),
            "parents": list(G.predecessors(node)),
            "children": list(G.successors(node))
        })

    edges = []
    for u, v in G.edges():
        data = G[u][v]
        edges.append({
            "id": f"{u}->{v}",
            "source": u,
            "target": v,
            "weight": round(float(data.get("weight", 1.0)), 4),
            "label": f"{round(float(data.get('weight', 1.0)), 2)}"
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "acyclic": nx.is_directed_acyclic_graph(G),
        "num_nodes": G.number_of_nodes(),
        "num_edges": G.number_of_edges()
    }
