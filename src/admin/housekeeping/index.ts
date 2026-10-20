/**
 * Admin Housekeeping Subsystem Barrel Exports (src/admin/housekeeping/index.ts)
 */

export {
  HkAssignmentBoard,
  DEFAULT_BOARD_ATTENDANTS,
  DEFAULT_BOARD_ROOMS,
  autoBalanceBoardRooms,
  buildTaskSheets,
  calculateTurnaroundCredits,
  getBoardText,
  resolveTurnaroundBadgeStyle,
  type BoardAttendant,
  type BoardRoom,
  type BoardTaskSheet,
  type HkAssignmentBoardProps,
  type RoomTurnaroundPriority,
  type TurnaroundType,
} from "./HkAssignmentBoard.js";
