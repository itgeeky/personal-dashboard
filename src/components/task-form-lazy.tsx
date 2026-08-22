"use client";

import dynamic from "next/dynamic";

const LazyTaskForm = dynamic(
  () => import("@/components/task-form").then((mod) => mod.TaskForm),
  { loading: () => null },
);

type TaskFormProps = React.ComponentProps<typeof LazyTaskForm>;

/**
 * Reserves the trigger footprint while the dialog chunk loads so rows do not
 * reflow. Edit triggers are icon-sized; the create trigger is a pill.
 */
export function TaskForm(props: TaskFormProps) {
  return (
    <span
      className={
        props.item
          ? "inline-flex size-7 shrink-0 items-center justify-center"
          : "inline-flex h-9 shrink-0 items-center"
      }
    >
      <LazyTaskForm {...props} />
    </span>
  );
}
