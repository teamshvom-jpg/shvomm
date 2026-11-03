from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    full_name: str


class LoginRequest(BaseModel):
    username: str
    password: str
