-- CreateTable
CREATE TABLE "PunchLog" (
    "id" SERIAL NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "punchType" TEXT NOT NULL,
    "punchTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PunchLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PunchLog" ADD CONSTRAINT "PunchLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
