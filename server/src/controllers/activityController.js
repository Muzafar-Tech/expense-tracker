import Activity from "../models/Activity.js";

/* ─────────────────────────────────────────────────────────────
   GET ACTIVITIES
   — All activities for current user, forever (never auto-deleted)
   — Supports ?type= filter for frontend buttons
   — group field is null-safe (survives group deletion)
────────────────────────────────────────────────────────────── */
export const getActivities = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.query;

    const query = { user: userId };
    if (type && type !== "all") {
      query.type = type;
    }

    const activities = await Activity.find(query)
      .populate({
        path: "group",
        select: "name",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .limit(200);

    const formattedActivities = activities.map((activity) => {
      const diff = Math.floor(
        (Date.now() - new Date(activity.createdAt)) / 1000
      );

      let time = "just now";
      if (diff < 60)         time = `${diff}s ago`;
      else if (diff < 3600)  time = `${Math.floor(diff / 60)}m ago`;
      else if (diff < 86400) time = `${Math.floor(diff / 3600)}h ago`;
      else                   time = `${Math.floor(diff / 86400)}d ago`;

      return {
        _id: activity._id,
        type: activity.type,
        description: activity.description,
        detail: activity.detail || "",
        group: activity.group ? activity.group.name : null,
        time,
        createdAt: activity.createdAt,
      };
    });

    res.json(formattedActivities);
  } catch (error) {
    console.error("getActivities error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE ACTIVITY  (user can manually delete any activity)
────────────────────────────────────────────────────────────── */
export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const activity = await Activity.findById(id);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    // Only allow deletion of own activities
    if (activity.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this activity" });
    }

    await activity.deleteOne();

    res.json({ message: "Activity deleted successfully" });
  } catch (error) {
    console.error("deleteActivity error:", error);
    res.status(500).json({ message: error.message });
  }
};