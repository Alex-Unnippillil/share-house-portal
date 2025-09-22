"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import Table from "@/components/ui/Table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import type { Tables } from "@/lib/supabase";

import {
  CHORE_CADENCE_LABELS,
  CHORE_CADENCES,
  type ChoreCadence,
  type ChoreTemplateFormValues,
} from "./config";
import {
  createChoreTemplate,
  deleteChoreTemplate,
  updateChoreTemplate,
} from "./actions";

type ChoreTemplate = Tables<"chores">;

type TemplateFormState = {
  title: string;
  cadence: ChoreCadence;
  point_value: string;
  requires_proof: boolean;
};

const defaultFormState: TemplateFormState = {
  title: "",
  cadence: "weekly",
  point_value: "10",
  requires_proof: false,
};

function toPayload(state: TemplateFormState): ChoreTemplateFormValues {
  return {
    title: state.title.trim(),
    cadence: state.cadence,
    point_value: Number(state.point_value),
    requires_proof: state.requires_proof,
  };
}

export default function TemplateManager({
  templates,
}: {
  templates: ChoreTemplate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createForm, setCreateForm] = useState<TemplateFormState>(defaultFormState);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TemplateFormState>(defaultFormState);
  const [editError, setEditError] = useState<string | null>(null);

  const cadenceOptions = CHORE_CADENCES.map((value) => ({
    value,
    label: CHORE_CADENCE_LABELS[value],
  }));

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    const payload = toPayload(createForm);

    startTransition(async () => {
      const result = await createChoreTemplate(payload);

      if (!result.success) {
        setCreateError(result.error);
        toast({
          title: "Unable to add chore template",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Chore template added",
        description: `${payload.title} is ready to assign.`,
      });

      setCreateForm(defaultFormState);
      router.refresh();
    });
  };

  const beginEdit = (template: ChoreTemplate) => {
    setEditError(null);
    setEditingId(template.id);
    setEditForm({
      title: template.title,
      cadence: (template.cadence as ChoreCadence) ?? "weekly",
      point_value: template.point_value.toString(),
      requires_proof: template.requires_proof ?? false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
    setEditForm(defaultFormState);
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingId === null) {
      return;
    }

    const payload = toPayload(editForm);
    setEditError(null);

    startTransition(async () => {
      const result = await updateChoreTemplate(editingId, payload);

      if (!result.success) {
        setEditError(result.error);
        toast({
          title: "Unable to update chore template",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Chore template updated",
        description: `${payload.title} has been saved.`,
      });

      cancelEdit();
      router.refresh();
    });
  };

  const handleDelete = (template: ChoreTemplate) => {
    if (!confirm(`Delete "${template.title}"?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteChoreTemplate(template.id);

      if (!result.success) {
        toast({
          title: "Unable to delete chore template",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (editingId === template.id) {
        cancelEdit();
      }

      toast({
        title: "Chore template removed",
        description: `${template.title} has been removed from the template list.`,
      });

      router.refresh();
    });
  };

  const headers = ["Title", "Cadence", "Points", "Proof", "Actions"];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add a chore template</CardTitle>
          <CardDescription>
            Configure the default chores that populate new roommate schedules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="template-title">Title</Label>
                <Input
                  id="template-title"
                  placeholder="E.g. Take out trash & recycling"
                  value={createForm.title}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template-cadence">Cadence</Label>
                <Select
                  value={createForm.cadence}
                  onValueChange={(value) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      cadence: value as ChoreCadence,
                    }))
                  }
                >
                  <SelectTrigger id="template-cadence">
                    <SelectValue placeholder="Select cadence" />
                  </SelectTrigger>
                  <SelectContent>
                    {cadenceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template-points">Point value</Label>
                <Input
                  id="template-points"
                  type="number"
                  min={0}
                  step={1}
                  value={createForm.point_value}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      point_value: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="template-proof"
                  checked={createForm.requires_proof}
                  onCheckedChange={(checked) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      requires_proof: checked === true,
                    }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="template-proof" className="font-medium">
                    Requires proof of completion
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle on when roommates should upload a receipt or photo.
                  </p>
                </div>
              </div>
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isPending}
              >
                Add template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template library</CardTitle>
          <CardDescription>
            Edit, duplicate, or remove the chores that new houses inherit by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table headers={headers}>
            {templates.length === 0 ? (
              <div className="px-5 py-8 text-sm text-muted-foreground">
                No chore templates have been created yet.
              </div>
            ) : (
              templates.map((template) => {
                const isEditing = editingId === template.id;

                if (isEditing) {
                  return (
                    <form
                      key={template.id}
                      onSubmit={handleEditSubmit}
                      className="grid grid-cols-5 gap-3 px-5 py-3 text-sm"
                    >
                      <div className="flex items-center">
                        <Input
                          value={editForm.title}
                          onChange={(event) =>
                            setEditForm((previous) => ({
                              ...previous,
                              title: event.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="flex items-center">
                        <Select
                          value={editForm.cadence}
                          onValueChange={(value) =>
                            setEditForm((previous) => ({
                              ...previous,
                              cadence: value as ChoreCadence,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {cadenceOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={editForm.point_value}
                          onChange={(event) =>
                            setEditForm((previous) => ({
                              ...previous,
                              point_value: event.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`requires-proof-${template.id}`}
                          checked={editForm.requires_proof}
                          onCheckedChange={(checked) =>
                            setEditForm((previous) => ({
                              ...previous,
                              requires_proof: checked === true,
                            }))
                          }
                        />
                        <Label htmlFor={`requires-proof-${template.id}`}>
                          Proof required
                        </Label>
                      </div>
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {editError && (
                          <p className="text-sm text-destructive sm:max-w-xs sm:text-right">
                            {editError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={cancelEdit}
                            disabled={isPending}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isPending}>
                            Save
                          </Button>
                        </div>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={template.id}
                    className="grid grid-cols-5 items-center gap-3 px-5 py-3 text-sm"
                  >
                    <div className="font-medium">{template.title}</div>
                    <div>{CHORE_CADENCE_LABELS[template.cadence as ChoreCadence] ?? template.cadence}</div>
                    <div>{template.point_value} pts</div>
                    <div>
                      <Badge variant={template.requires_proof ? "default" : "secondary"}>
                        {template.requires_proof ? "Proof required" : "No proof"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => beginEdit(template)}
                        disabled={isPending}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleDelete(template)}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
