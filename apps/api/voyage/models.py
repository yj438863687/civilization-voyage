from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Crew(Input):
    id: str
    role: str
    model_id: Optional[str] = None
    confirmation: Literal['pending', 'confirmed'] = 'pending'

class Route(Input):
    id: str
    steps: List[str]
    rationale: str
    budget: float = Field(ge=0)
    currency: str
    # A cost estimate is not evidence of correctness.

class VoyageCreate(Input):
    title: str = Field(min_length=1, max_length=200)
    scene_id: str = 'neutral-test'
    scene_version: int = Field(default=1, ge=1)
    scene_track: Literal['test', 'candidate', 'confirmed'] = 'test'
    question: str = ''
    shared_task: str = ''
    crew: List[Crew] = Field(default_factory=list)
    route: Optional[Route] = None

class Voyage(VoyageCreate):
    id: str
    scene_snapshot: Dict[str, Any]
    owner: Literal['local'] = 'local'
    stage: Literal['cockpit', 'route', 'world', 'reflection'] = 'cockpit'
    world: Dict[str, Any] = Field(default_factory=lambda: {'port_id': 'test-port'})
    balance: int
    capacity: int
    inventory: Dict[str, int]
    resource_kind: Literal['fictional_test_resource'] = 'fictional_test_resource'

class VoyageUpdate(Input):
    stage: Literal['cockpit', 'route', 'world', 'reflection']
    question: str
    shared_task: str
    crew: List[Crew]
    route: Optional[Route] = None
    world: Dict[str, Any]

class Source(Input):
    id: str
    title: str
    url: str
    license: str
    verification: Literal['unverified', 'verified'] = 'unverified'

class RecordCreate(Input):
    kind: Literal['material', 'fragment', 'choice', 'artifact', 'log', 'reflection']
    text: str = Field(min_length=1)
    classification: Literal['historical_claim', 'counterfactual', 'creative', 'test']
    sources: List[Source] = Field(default_factory=list)
    material_ids: List[str] = Field(default_factory=list)
    version: int = Field(default=1, ge=1)
    access: Literal['private'] = 'private'

class Record(RecordCreate):
    id: str
    voyage_id: str

class TradeCreate(Input):
    request_id: str = Field(min_length=1, max_length=100)
    port_id: str
    good_id: str
    side: Literal['buy', 'sell']
    quantity: int = Field(gt=0, le=100000)

class Trade(TradeCreate):
    id: str
    delta_balance: int
    delta_inventory: int
    balance_after: int
    inventory_after: int
    resource_kind: Literal['fictional_test_resource'] = 'fictional_test_resource'

class TaskCreate(Input):
    request_id: str = Field(min_length=1, max_length=100)
    prompt: str = Field(min_length=1, max_length=32000)
    model_id: str

class Task(TaskCreate):
    id: str
    voyage_id: str
    status: Literal['queued', 'running', 'succeeded', 'failed', 'cancelled']
    cancel_requested: bool = False

class Event(BaseModel):
    seq: int
    task_id: str
    kind: str
    data: Dict[str, Any]

class Usage(BaseModel):
    task_id: str
    model: str
    elapsed_ms: int
    usage: Dict[str, Any]
    settlement: Literal['not_connected'] = 'not_connected'

class ModelInfo(BaseModel):
    id: str
    model: str
    capabilities: List[str]
    credential_source: Literal['server_environment'] = 'server_environment'

class Port(BaseModel):
    id: str
    name: str
    goods: Dict[str, Dict[str, int]]
    resource_kind: Literal['fictional_test_resource'] = 'fictional_test_resource'

class Scene(Input):
    id: str
    version: int = Field(ge=1)
    status: Literal['test', 'pending', 'confirmed']
    label: str
    background: str
    cultural_core: str
    questions: List[str]
    fragments: List[str]
    interactions: List[str]
    economy: str
    educational_value: str
    sources: List[Source]
    needs_verification: List[str]

class Confirmation(Input):
    reviewer: str = Field(min_length=1)
    decision_note: str = Field(min_length=1)

class Provider(Input):
    id: str
    url: str
    model: str
    key_env: str = Field(pattern=r'^VOYAGE_SECRET_[A-Z0-9_]+$')
    capabilities: List[Literal['chat']] = Field(default_factory=lambda: ['chat'])
