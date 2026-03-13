// client/src/api/groupApi.js
import axios from "./axiosConfig";

export const getGroups = async () => {
  const res = await axios.get("/groups");
  return res.data;
};

export const createGroup = async (data) => {
  const res = await axios.post("/groups", data);
  return res.data;
};

export const getGroupDetail = async (id) => {
  const res = await axios.get(`/groups/${id}`);
  return res.data;
};

export const addMember = async (groupId, email) => {
  const res = await axios.post(`/groups/${groupId}/members`, { email });
  return res.data;
};

export const removeMember = async (groupId, memberId) => {
  const res = await axios.delete(`/groups/${groupId}/members/${memberId}`);
  return res.data;
};

export const deleteGroup = async (id) => {
  const res = await axios.delete(`/groups/${id}`);
  return res.data;
};