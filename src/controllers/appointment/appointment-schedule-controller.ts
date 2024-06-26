import { Request, Response } from "express";
import { z } from "zod";
import { PrismaAppointmentsRepository } from "../../repositories/prisma/prisma-appointments-repository";
import { AppointmentScheduleService } from "../../services/appointment-schedule-service";
import { InvalidAppointmentDateError } from "../../services/errors/invalid-appointment-date-error";
import { pdfGenerator } from "../../utils/pdf-generator";

export class AppointmentScheduleController {
  async handle(req: Request, res: Response) {
    const user = z.object({
      user_id: z.string().uuid(),
      name: z.string(),
    });

    const createAppointment = z.object({
      appointment_type: z.string(),
      appointment_date: z.string(),
      notes: z.string(),
    });

    const { user_id, name } = user.parse(req);

    const { appointment_type, appointment_date, notes } =
      createAppointment.parse(req.body);

    const appointmentsRepository = new PrismaAppointmentsRepository();
    const appointmentSchedule = new AppointmentScheduleService(
      appointmentsRepository
    );

    try {
      const { appointment } = await appointmentSchedule.execute({
        user_id,
        appointment_date,
        appointment_type,
        notes,
      });

      const pdfBuffer = await pdfGenerator({
        user_name: name,
        appointment_date,
        appointment_type,
        status: appointment.status,
        notes,
      });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${appointment.id}.pdf`
      );
      res.setHeader("Content-Type", "application/pdf");

      res.status(200).send(pdfBuffer);
    } catch (err) {
      if (err instanceof InvalidAppointmentDateError) {
        return res.status(400).send({ message: err.message });
      }
      throw err;
    }
  }
}
