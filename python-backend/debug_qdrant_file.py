
from qdrant_client import QdrantClient
import json

attrs = dir(QdrantClient)
with open("qdrant_attributes.txt", "w") as f:
    json.dump(attrs, f, indent=2)
